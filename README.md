🗳️ Online Voting Portal — Secure Local MVP

A Fully Functional, Encrypted, Paperless Voting System (Localhost)

🌟 Project Overview

This project is a secure, fully working Online Voting Portal built as a local MVP (Minimum Viable Product). It demonstrates how a real-world digital election system works using:

🔐 Secure authentication

🧾 Encrypted voting

✅ One-person-one-vote enforcement

🔍 Transparent verification through public receipts

👨‍💼 Admin-controlled elections and live results

Everything runs 100% locally on localhost using file-based local storage, making it safe, fast, portable, and perfect for academic demonstrations.

🎯 Key Objectives

✅ Build a paperless voting system
✅ Ensure vote secrecy & tamper resistance
✅ Prevent duplicate voting
✅ Provide vote verification without revealing identity
✅ Allow admins to manage elections & candidates
✅ Store everything locally without any online database

🧠 How the System Works (Logic Flow)
🔑 1. Secure Authentication

Users register & log in

Passwords are hashed for security

Sessions are used for authentication

Two roles exist:

👨‍💼 Admin

🧑‍💻 Voter

🗳️ 2. Election & Voting Logic

Admin creates elections

Admin adds candidates

Election can be opened or closed

Voters can:

View open elections

Vote only once per election

Instantly receive a vote receipt

🔐 3. Vote Encryption

Each vote is:

🔒 Encrypted using AES-256 cryptography

❌ Never stored in plain text

✅ Safe from tampering

🧾 4. Public Receipt Verification

Every vote generates a unique verification hash

Hash is:

✅ Shown to the voter

✅ Stored in a public verification list

Anyone can verify that their vote exists, without knowing who they voted for

📊 5. Admin Live Results

Vote tallies update instantly

Admin sees:

Candidates

Total votes

Live results

Public receipts list

💾 Data Storage (No Online Database Used)

⚠️ Important:
This project deliberately does NOT use any cloud database.

Instead, it uses:

✅ File-Based Local Storage
✅ Data saved as .db files
✅ Stored inside the project folder
✅ Works completely offline
✅ Makes the project:

Portable

Safe for demos

Easy to reset

Perfect for academic use

🗂️ Project Folder Structure
📁 Online-Voting-Portal
│
├── 📁 public          → CSS & frontend assets
├── 📁 views           → All EJS UI templates
├── 📁 data            → Local database files
│
├── 📄 app.js          → Main server logic
├── 📄 db.js           → Local database configuration
├── 📄 package.json   → Dependencies & scripts
├── 📄 .env            → Encryption & session secrets (ignored in GitHub)
├── 📄 .gitignore     → Protects secrets & runtime files

🛡️ Security Features

✅ Password hashing
✅ AES-256 encrypted ballots
✅ Session-based authentication
✅ One-vote-per-user rule
✅ Public receipt transparency
✅ Admin-only protected routes
✅ No plaintext vote storage

🚀 How to Run Locally

Once downloaded from GitHub:

npm install
npm start


Then open in browser:

http://localhost:3000


✅ Default Admin Login:

Username: admin
Password: admin123

🧪 What Can Be Demonstrated Live

✔️ Admin creating an election
✔️ Adding candidates
✔️ Registering a voter
✔️ Casting a vote
✔️ Viewing the encrypted vote receipt
✔️ Verifying it in public receipts
✔️ Watching real-time admin tally updates

🧩 Why This Project is Special

✨ Works without internet
✨ No cloud dependency
✨ No external database
✨ Fully encrypted
✨ Transparent yet anonymous
✨ Easily expandable to:

✅ Blockchain voting

✅ AI-based fraud detection

✅ Biometric authentication

🏆 Academic Value

This project demonstrates:

✔️ Full-stack development

✔️ Security implementation

✔️ Authentication systems

✔️ Cryptography in real applications

✔️ Admin dashboards

✔️ Live data synchronization

✔️ Clean project architecture

🤝 Final Note

This Online Voting Portal is built as a foundation system that can be expanded into:

🧠 AI-Secured Voting Systems

💠 Blockchain Voting Platforms

🏛️ Institutional Election Portals

📱 Mobile-based Voting Systems
