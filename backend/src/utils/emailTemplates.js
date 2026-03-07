const paymentReceivedTemplate = ({ senderName, amount, assetType, txnId }) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}
.header{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center}
.body{background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px}
.amount{font-size:28px;font-weight:bold;color:#6366f1;text-align:center;margin:16px 0}
.details{background:#fff;padding:16px;border-radius:8px;margin:12px 0}
.label{color:#64748b;font-size:13px}.value{color:#1e293b;font-weight:600}
.footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:16px}
</style></head>
<body>
<div class="header"><h1>💸 Payment Received!</h1></div>
<div class="body">
<div class="amount">${amount} ${assetType}</div>
<div class="details">
<p><span class="label">From:</span> <span class="value">@${senderName}</span></p>
<p><span class="label">Transaction ID:</span> <span class="value" style="word-break:break-all">${txnId}</span></p>
</div>
<p style="text-align:center;color:#64748b">Log in to CampusWallet to view your updated balance.</p>
</div>
<div class="footer">CampusWallet — Campus Student Payment System</div>
</body>
</html>`;

const splitInviteTemplate = ({ creatorName, title, shareAmount, assetType }) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}
.header{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center}
.body{background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px}
.amount{font-size:28px;font-weight:bold;color:#f59e0b;text-align:center;margin:16px 0}
.details{background:#fff;padding:16px;border-radius:8px;margin:12px 0}
.label{color:#64748b;font-size:13px}.value{color:#1e293b;font-weight:600}
.footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:16px}
</style></head>
<body>
<div class="header"><h1>📋 Split Bill Invite</h1></div>
<div class="body">
<p style="text-align:center;font-size:18px"><strong>@${creatorName}</strong> added you to a split bill</p>
<div class="details">
<p><span class="label">Bill Title:</span> <span class="value">${title}</span></p>
<p><span class="label">Your Share:</span> <span class="value">${shareAmount} ${assetType}</span></p>
</div>
<p style="text-align:center;color:#64748b">Log in to CampusWallet to view and settle your share.</p>
</div>
<div class="footer">CampusWallet — Campus Student Payment System</div>
</body>
</html>`;

const splitSettledTemplate = ({ billTitle, totalSettled, assetType }) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}
.header{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center}
.body{background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px}
.amount{font-size:28px;font-weight:bold;color:#10b981;text-align:center;margin:16px 0}
.details{background:#fff;padding:16px;border-radius:8px;margin:12px 0}
.footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:16px}
</style></head>
<body>
<div class="header"><h1>✅ Split Bill Settled!</h1></div>
<div class="body">
<div class="amount">${totalSettled} ${assetType}</div>
<div class="details">
<p><strong>${billTitle}</strong> has been fully settled.</p>
</div>
<p style="text-align:center;color:#64748b">Log in to CampusWallet to view details.</p>
</div>
<div class="footer">CampusWallet — Campus Student Payment System</div>
</body>
</html>`;

module.exports = {
    paymentReceivedTemplate,
    splitInviteTemplate,
    splitSettledTemplate,
};
