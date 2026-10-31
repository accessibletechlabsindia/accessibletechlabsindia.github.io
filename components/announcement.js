var SHOW_ANNOUNCEMENT = true;

document.addEventListener("DOMContentLoaded", function() {
    if (!SHOW_ANNOUNCEMENT) return;

    var style = document.createElement("style");
    style.textContent = `
        #atliModalDialog {
            border: none;
            border-radius: 12px;
            padding: 0;
            max-width: 620px;
            width: 92%;
            max-height: 90vh;
            background-color: var(--card-bg, #ffffff);
            color: var(--text-main, #333333);
            border-top: 8px solid var(--primary-blue, #005a9c);
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
            margin: auto;
            box-sizing: border-box;
            font-family: inherit;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        #atliModalDialog::backdrop {
            background-color: rgba(2, 10, 18, 0.85);
            backdrop-filter: blur(6px);
        }
        .modal-header-bar {
            background-color: #eef4ff;
            padding: 14px 20px;
            border-bottom: 2px solid #b8daff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        .modal-body-content {
            padding: 16px 20px;
            overflow-y: auto;
            line-height: 1.5;
        }
        .modal-param-box {
            background-color: #f8f9fa;
            border-left: 5px solid var(--primary-blue, #005a9c);
            padding: 10px 16px;
            border-radius: 6px;
            margin: 10px 0;
        }
        .modal-topics-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            margin: 8px 0;
        }
        .modal-topic-item {
            background: #ffffff;
            border: 1px solid var(--border-color, #e2e8f0);
            padding: 8px 12px;
            border-radius: 6px;
        }
        .modal-footer-bar {
            padding: 12px 20px 16px 20px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            flex-shrink: 0;
            border-top: 1px solid var(--border-color, #e2e8f0);
            background-color: #ffffff;
        }
    `;
    document.head.appendChild(style);

    var dialog = document.createElement("dialog");
    dialog.id = "atliModalDialog";
    dialog.setAttribute("aria-labelledby", "modalHeadingTitle");
    dialog.setAttribute("aria-modal", "true");

    dialog.innerHTML = `
        <div class="modal-header-bar">
            <h2 id="modalHeadingTitle" style="color: var(--primary-blue-dark, #003d6b); margin: 0; font-size: 1.3rem;" tabindex="-1">Admissions Open: Batch 3 Training Program</h2>
            <button type="button" id="modalTopCloseBtn" aria-label="Close Announcement" style="background: none; border: none; font-size: 1.8rem; line-height: 1; cursor: pointer; color: var(--primary-blue-dark, #003d6b); font-weight: bold; padding: 0 6px;">&times;</button>
        </div>
        <div class="modal-body-content">
            <p style="margin-top: 0; font-weight: bold; color: var(--primary-blue, #005a9c); font-size: 1.05rem; margin-bottom: 6px;">
                Free Basic to Advanced Computer & Cyber Safety Awareness Course
            </p>
            <p style="margin-bottom: 6px; font-size: 0.95rem;">
                Accessible Tech Labs India welcomes blind, low-vision, and sighted students to join our complete 3-month digital learning journey.
            </p>
            <p style="margin-bottom: 10px; color: #475569; font-size: 0.92rem;">
                This course is specially designed to take you step-by-step from beginner to advanced level with practical live guidance. No prior technical experience is required to join!
            </p>
            <div class="modal-param-box">
                <ul style="margin: 0; padding-left: 18px; line-height: 1.6; font-size: 0.92rem;">
                    <li><strong>Course Duration:</strong> 1 November 2026 to 16 February 2027 (3 Months)</li>
                    <li><strong>Class Timing:</strong> 5:00 PM to 6:00 PM IST (Monday to Saturday)</li>
                    <li><strong>Mode:</strong> Live Interactive Sessions on Google Meet (Hindi)</li>
                    <li><strong>Assessment & Certificate:</strong> Weekly Saturday Tests & Official Certificate</li>
                    <li><strong>Tuition Fee:</strong> 100% Free of Cost (Zero Hidden Charges)</li>
                </ul>
            </div>
            <h3 style="color: var(--primary-blue, #005a9c); margin: 12px 0 6px 0; font-size: 1.1rem;">What You Will Learn:</h3>
            <div class="modal-topics-grid">
                <div class="modal-topic-item" style="font-size: 0.92rem;">
                    <strong>Computer & Office Mastery:</strong> Windows Navigation, Microsoft Word, Advanced Microsoft Excel Formulas, Microsoft PowerPoint, Command Prompt Automation, Assistive AI Tools, and much more practical digital skills!
                </div>
                <div class="modal-topic-item" style="font-size: 0.92rem;">
                    <strong>Cyber Defense & Safety:</strong> Financial & UPI Payment Fraud Defense, Social Engineering & Phishing Protection, Two-Factor Authentication, Password Safety, Digital Forensics, and much more essential self-defense tactics!
                </div>
            </div>
        </div>
        <div class="modal-footer-bar">
            <a href="forms/registration.html" class="btn" style="flex: 2; padding: 11px; text-decoration: none; text-align: center;">Register for Batch 3</a>
            <button type="button" id="modalSkipBtn" class="btn" style="flex: 1; background-color: #64748b; padding: 11px;">Skip Announcement</button>
        </div>
    `;

    document.body.appendChild(dialog);

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
        var heading = document.getElementById("modalHeadingTitle");
        if (heading) {
            heading.focus();
        }
    }

    function closeModal() {
        dialog.close();
        dialog.remove();
        var skipLink = document.querySelector(".skip-link");
        if (skipLink) {
            skipLink.focus();
        }
    }

    document.getElementById("modalTopCloseBtn").addEventListener("click", closeModal);
    document.getElementById("modalSkipBtn").addEventListener("click", closeModal);
    dialog.addEventListener("cancel", closeModal);
});