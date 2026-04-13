# Exercise 19: Deploying the Book App to AWS EC2

---

## Overview
 Right our MERN app runs on `localhost`. In this lab you will deploy it to AWS EC2, make it publicly accessible over HTTP, and then secure it with HTTPS using a self-signed certificate via OpenSSL. A Certbot path for when you have a real domain is included as a bonus section.

---


### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/books` | Fetch all books |
| POST | `/api/books` | Create a new book |
| PUT | `/api/books/:id` | Toggle read/unread |
| DELETE | `/api/books/:id` | Delete a book |

### Important — API URL in App.jsx

The client uses `const API_URL = '/api/books'` — a relative path. This is intentional. In production, Nginx receives the request at port 80 and forwards `/api/` calls to Express on port 5000. Never use `http://localhost:5000` in the frontend code for a deployed app.

---

## What You Will Need

- An AWS account (free tier is sufficient)
- The `book-app` repository on GitHub
- Your MongoDB Atlas connection string
- A terminal (macOS Terminal, Windows WSL, or Git Bash)

---

## Part 1 — Push the Book App to GitHub

Make sure you have access to this repository.
```

---

## Part 2 — Launch an EC2 Instance

### Step 2.1 — Open EC2

1. Sign in/Create an account at [https://aws.amazon.com](https://aws.amazon.com).
2. Search **EC2** in the top bar and click it.
3. Click **Launch instance**.

### Step 2.2 — Configure the instance

| Setting | Value |
|---|---|
| **Name** | `book-app-server` |
| **OS Image** | Ubuntu Server 22.04 LTS (Free tier eligible) |
| **Architecture** | 64-bit (x86) |
| **Instance type** | `t2.micro` (Free tier eligible) |
| **Key pair** | Create new (Step 2.3) |

### Step 2.3 — Create a key pair

1. Click **Create new key pair**.
2. Name: `book-app-key`, Type: **RSA**, Format: **.pem**
3. Click **Create key pair** — the `.pem` file downloads automatically.
4. Move it and restrict its permissions:

```bash
mv ~/Downloads/book-app-key.pem ~/.ssh/book-app-key.pem
chmod 400 ~/.ssh/book-app-key.pem
```

### Step 2.4 — Configure the Security Group

Under **Network settings → Edit**, add four inbound rules:

| Type | Port | Source | Purpose |
|---|---|---|---|
| SSH | 22 | My IP | Terminal access |
| HTTP | 80 | Anywhere (0.0.0.0/0) | Web traffic + Certbot domain verification |
| HTTPS | 443 | Anywhere (0.0.0.0/0) | Encrypted web traffic (TLS) |

> **Why keep port 80 open even after enabling HTTPS?** Two reasons. First, Certbot uses an HTTP challenge on port 80 to prove you own the domain before issuing a certificate. Second, you will configure Nginx to redirect all HTTP traffic to HTTPS — that redirect itself must come through port 80.

### Step 2.5 — Launch and copy the public IP

1. Click **Launch instance** and wait ~1 minute for **Running** status.
2. Click the instance name and copy the **Public IPv4 address**. You will use this throughout the lab.

---

## Part 3 — Connect to the Server

```bash
ssh -i ~/.ssh/book-app-key.pem ubuntu@<YOUR-PUBLIC-IP>
```

Type `yes` at the fingerprint prompt. You should land at an `ubuntu@ip-...` shell.

Update the OS:

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Part 4 — Install Node.js and Nginx

```bash
# Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Confirm both are installed
node -v && npm -v

# Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

**Quick test:** Open `http://<YOUR-PUBLIC-IP>` in a browser — the Nginx welcome page confirms port 80 is working.

---

## Part 5 — Clone the Book App Repository

```bash
sudo apt install -y git

git clone https://github.com/<your-username>/book-app.git /home/ubuntu/book-app

# Confirm both folders are present
ls /home/ubuntu/book-app
# Expected: client  server
```

If your repository is private, GitHub will prompt for your username and a personal access token (GitHub → Settings → Developer settings → Personal access tokens).

---

## Part 6 — Install Dependencies and Build the React Client

### Server dependencies

```bash
cd /home/ubuntu/book-app/server
npm install
```

### React production build

```bash
cd /home/ubuntu/book-app/client
npm install
npm run build
```

Vite compiles the React and Tailwind CSS into optimised static files in `client/dist/`. Verify:

```bash
ls /home/ubuntu/book-app/client/dist
# Expected: index.html  assets/
```

---

## Part 7 — Create the `.env` File on the Server

The `.env` file is never committed to git. Create it manually on the server. Use `.env.example` as your template:

```bash
nano /home/ubuntu/book-app/server/.env
```

Fill in your values (refer to `.env.example` for the required keys):

```
PORT=5000
MONGO_URI=<your MongoDB Atlas connection string>
NODE_ENV=production
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`.

Verify it saved correctly:

```bash
cat /home/ubuntu/book-app/server/.env
```

> **MongoDB Atlas Network Access:** Go to Atlas → Network Access → Add IP Address and add your EC2 public IP (or `0.0.0.0/0` for the lab). Without this, every database call will time out.

---

## Part 8 — Start the API with PM2

PM2 is a process manager that keeps Express running after you close the SSH session.

```bash
# Install PM2 globally (sudo required to write to /usr/lib/node_modules)
sudo npm install -g pm2

# Start the Book App API
cd /home/ubuntu/book-app/server
pm2 start index.js --name "book-app-api"

# Persist PM2 across server reboots
pm2 startup        # copy and run the printed command exactly
pm2 save
```

Verify the process is running:

```bash
pm2 status
# book-app-api should show "online"
```

Test the API directly from the server:

```bash
curl http://localhost:5000/api/books
# Expected: [] (empty array)
```

If you see an error, inspect the logs:

```bash
pm2 logs book-app-api --lines 30
```

---

## Part 9 — Configure Nginx

Nginx has two jobs: serve the React build (`client/dist/`) for browser requests, and forward `/api/` calls to Express on port 5000.

### Step 9.1 — Confirm your repo path and dist folder

Before writing the Nginx config, verify the exact path to your cloned repository and confirm the React build exists. **The Nginx `root` directive must match this path exactly — if it doesn't, you will get a 500 error.**

```bash
# Find your actual repo folder name
ls /home/ubuntu/
# Example output: book-app   or   CSCI441SP-exercise_19   or whatever you named it

# Confirm the dist folder exists and contains index.html
ls /home/ubuntu/<YOUR-REPO-FOLDER>/client/dist/
# Expected: index.html  assets/
```

If `dist/` is empty or missing `index.html`, the React build has not been run yet. Go back to Part 6 and run `npm run build` inside the `client/` folder.

Note your full path — you will use it in the next step:
```
/home/ubuntu/<YOUR-REPO-FOLDER>/client/dist
```

### Step 9.2 — Create the config file

```bash
sudo nano /etc/nginx/sites-available/book-app
```

Paste the following configuration. **Replace `<YOUR-REPO-FOLDER>` with your actual folder name from Step 9.1** (e.g. `book-app` or `CSCI441SP-exercise_19`):

```nginx
server {
    listen 80;
    server_name _;

    # Serve the React (Vite) production build
    # IMPORTANT: replace <YOUR-REPO-FOLDER> with your actual folder name
    root /home/ubuntu/<YOUR-REPO-FOLDER>/client/dist;
    index index.html;

    # React Router support — return index.html for all frontend routes
    # Without this, refreshing on any route other than / returns a 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy all /api/ requests to the Express server on port 5000
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit: `Ctrl+O` → `Enter` → `Ctrl+X`.

Verify the `root` path in the saved file matches your actual `dist/` location:

```bash
grep root /etc/nginx/sites-available/book-app
# Should print something like:
#   root /home/ubuntu/CSCI441SP-exercise_19/client/dist;
```

### Step 9.3 — Enable the site and reload

```bash
# Enable the book-app config
sudo ln -s /etc/nginx/sites-available/book-app /etc/nginx/sites-enabled/

# Remove the default Nginx placeholder page
sudo rm /etc/nginx/sites-enabled/default

# Give Nginx (which runs as www-data) permission to traverse into
# the ubuntu home directory and read the dist files.
# 755 = owner has full access, everyone else can read and traverse.
sudo chmod 755 /home/ubuntu
sudo chmod -R 755 /home/ubuntu/<YOUR-REPO-FOLDER>/client/dist

# Validate the config — fix any errors before proceeding
sudo nginx -t

# Apply the new config
sudo systemctl reload nginx
```

`sudo nginx -t` must report **syntax is ok** and **test is successful** before you reload.

---

## Part 10 — Test the Live Application

Open a browser and go to:

```
http://<YOUR-PUBLIC-IP>
```

Work through this checklist:

- [ ] The teal header loads with **📖 My Book Collection**
- [ ] The Add a New Book form is visible
- [ ] Add a book — it appears in the list
- [ ] Click **Mark Read** — the card turns green and shows the ✓ Read badge
- [ ] Click **Delete** — the card is removed
- [ ] **Refresh the page** — books are still there (persisted in MongoDB, not just React state)
- [ ] Open **DevTools → Network tab** — `GET /api/books` returns HTTP 200 with a JSON array

---

## Part 11 — Enable HTTPS with a Self-Signed Certificate

Since we are working with an IP address and not a domain name, we will use **OpenSSL** to generate a self-signed certificate. This encrypts traffic between the browser and the server. The browser will show a "not private" warning because the certificate is not issued by a trusted certificate authority — this is expected and normal for a lab environment.

### Step 11.1 — Generate the certificate and private key

```bash
sudo mkdir -p /etc/nginx/ssl

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/book-app.key \
  -out /etc/nginx/ssl/book-app.crt \
  -subj "/C=US/ST=State/L=City/O=CSCI441/CN=<YOUR-PUBLIC-IP>"
```

Replace `<YOUR-PUBLIC-IP>` with your actual EC2 public IP address in the `-subj` flag.

What each flag does:

| Flag | Purpose |
|------|---------|
| `-x509` | Produce a self-signed certificate (not a signing request) |
| `-nodes` | Do not password-protect the key — Nginx needs to load it automatically |
| `-days 365` | Certificate is valid for one year |
| `-newkey rsa:2048` | Generate a new 2048-bit RSA key pair at the same time |
| `-keyout` | Path to save the private key |
| `-out` | Path to save the certificate |
| `-subj` | Certificate subject fields (country, state, org, common name) |

Confirm both files were created:

```bash
ls /etc/nginx/ssl/
# Expected: book-app.crt  book-app.key
```

### Step 11.2 — Update the Nginx config for HTTPS

Open the existing config file:

```bash
sudo nano /etc/nginx/sites-available/book-app
```

Replace the entire contents with the following. This version adds an SSL server block on port 443 and redirects all HTTP traffic to HTTPS:

```nginx
# Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/book-app.crt;
    ssl_certificate_key /etc/nginx/ssl/book-app.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Serve the React (Vite) production build
    root /home/ubuntu/book-app/client/dist;
    index index.html;

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api/ requests to Express
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit: `Ctrl+O` → `Enter` → `Ctrl+X`.

### Step 11.3 — Validate and reload Nginx

```bash
sudo nginx -t
# Expected: syntax is ok / test is successful

sudo systemctl reload nginx
```

### Step 11.4 — Test HTTPS in the browser

Navigate to:

```
https://<YOUR-PUBLIC-IP>
```

Your browser will show a security warning because the certificate is self-signed. This is expected — proceed past it:

- **Chrome / Edge:** Click **Advanced** → **Proceed to \<IP\> (unsafe)**
- **Firefox:** Click **Advanced** → **Accept the Risk and Continue**
- **Safari:** Click **Show Details** → **visit this website**

The Book App should load and the address bar should show `https://`.

Also verify the HTTP redirect works — navigate to:

```
http://<YOUR-PUBLIC-IP>
```

The browser should automatically redirect to `https://` and the Book App should load.

---

## Troubleshooting

### 500 Internal Server Error
There are two common causes. Check the Nginx error log first to identify which one:
```bash
sudo tail -20 /var/log/nginx/error.log
```

**Cause 1 — `rewrite or internal redirection cycle` in the log:**
The `root` path in the Nginx config does not match where your `dist/` folder actually is, so `index.html` is never found and Nginx loops. Verify the path:
```bash
ls /home/ubuntu/
# Note your actual repo folder name

ls /home/ubuntu/<YOUR-REPO-FOLDER>/client/dist/
# Must show index.html
```
Then open the config and correct the `root` line:
```bash
sudo nano /etc/nginx/sites-available/book-app
# Fix: root /home/ubuntu/<YOUR-ACTUAL-FOLDER>/client/dist;
sudo nginx -t && sudo systemctl reload nginx
```
If `dist/` is empty or missing, the React build was not run. Run it:
```bash
cd /home/ubuntu/<YOUR-REPO-FOLDER>/client && npm run build
```

**Cause 2 — `permission denied` in the log:**
Nginx cannot traverse into the home directory. Fix with:
```bash
sudo chmod 755 /home/ubuntu
sudo chmod -R 755 /home/ubuntu/<YOUR-REPO-FOLDER>/client/dist
sudo systemctl reload nginx
```

### Nginx welcome page instead of the Book App
The `default` site was not removed or the symlink is missing:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### EACCES permission denied when running `npm install -g`
Global npm packages install into `/usr/lib/node_modules`, which is owned by root. Always use `sudo` for global installs on the server:
```bash
sudo npm install -g pm2
```
Never use `sudo` for local installs (`npm install` inside a project folder) — only for `-g` global installs.

### 502 Bad Gateway
Express is down or crashed. Check:
```bash
pm2 status
pm2 logs book-app-api --lines 50
```
Most common cause: wrong `MONGO_URI` in `.env`, or MongoDB Atlas has not whitelisted the EC2 IP.

### Books load but Add / Delete / Toggle fail
The Nginx `/api/` proxy block has an error. Inspect:
```bash
cat /etc/nginx/sites-available/book-app
sudo nginx -t
```

### White screen after navigating (React Router)
The `try_files $uri $uri/ /index.html;` line is missing from the `location /` block. Fix the config and reload Nginx.

### Books disappear on refresh
The frontend is not hitting the API. Confirm `App.jsx` on the server uses `const API_URL = '/api/books'` and not `http://localhost:5000/api/books`. If the code is wrong, fix locally, push, then on the server:
```bash
cd /home/ubuntu/book-app && git pull
cd client && npm run build
sudo systemctl reload nginx
```

### EACCES permission denied when installing PM2
Global npm packages are written to `/usr/lib/node_modules/` which is owned by root. Always use `sudo` for global installs on Ubuntu:
```bash
sudo npm install -g pm2
```

### ERR_CONNECTION_REFUSED on port 443
Port 443 is not open in the EC2 Security Group. Go to EC2 → Security Groups → your group → Inbound rules and add an HTTPS rule for port 443 from anywhere.

### Nginx fails to start after adding SSL config
The certificate or key path is wrong, or the files were not created. Check:
```bash
ls /etc/nginx/ssl/
sudo nginx -t
```
The `-t` output will point to the exact line causing the error.

### Browser shows ERR_CERT_AUTHORITY_INVALID
This is the expected self-signed certificate warning — it means the certificate was not issued by a trusted certificate authority. Click through it (Advanced → Proceed). The app will work normally once you accept the warning.

---

## Submission

Submit the following on Blackboard:

1. Screenshot of the Book App in the browser with the **EC2 public IP in the address bar** and at least two books in the list
2. Screenshot of `pm2 status` showing `book-app-api` as **online**
3. Screenshot of **DevTools → Network tab** showing a successful `GET /api/books` with a JSON response
4. Screenshot of the app loading over **`https://`** (browser warning accepted and visible in address bar)
5. Screenshot showing that `http://<YOUR-IP>` **redirects** to `https://` (the address bar should show `https://` after loading)
6. Your EC2 public IP address (paste as plain text in the submission comments)

---

## Cleanup — Avoid AWS Charges

When the lab is graded, stop or terminate your instance:

1. EC2 → Instances → select `book-app-server`
2. **Instance state → Stop** — pauses compute charges, data is preserved
3. **Instance state → Terminate** — deletes everything permanently

> `t2.micro` is free for 750 hrs/month under AWS Free Tier for the first 12 months. Stopping unused instances is good practice regardless.

---

