# Monexa Flow V1 — Documentation for Chrome Web Store Reviewers

## Project Overview
**Monexa Flow** is a professional banking audit tool designed for accountants and financial managers in Uruguay. It acts as an intelligent overlay on top of the Itau Bank website, allowing users to categorize bank transactions, add audit notes, and visualize financial health through a premium dashboard.

## Security & Privacy (Manifest V3)
This extension strictly adheres to Google's Privacy Policies:
- **No Remote Code:** All logic is bundled within the package.
- **Local Storage ONLY:** All user-generated audit data (tags, notes) is stored via `chrome.storage.local`. No data ever leaves the user's machine.
- **Privacy by Design:** The extension does not capture passwords, personal info, or sensitive bank credentials. It only reads transaction descriptions to correlate them with local audit tags.

## Permission Justification
- `storage`: To save audit tags, notes, and user settings locally.
- `unlimitedStorage`: To ensure audit history is not capped for heavy users.
- `tabs`: To allow the extension to open the "Audit Dashboard" in a new tab.

## How to Test
1. Install the extension.
2. Navigate to an Itau Bank transaction history page (e.g., `itaulink.com.uy`).
3. Observe new columns (Tags, Notes, Status) being injected into the transaction table.
4. Click the Monexa icon to open the Dashboard and see the data visualization.

---
Developed by **LBM Studios**.
