class AtliFooter extends HTMLElement {
    connectedCallback() {
        let p = this.getAttribute("path") || "";
        let activePage = this.getAttribute("active") || "";
        this.innerHTML = `
        <footer role="contentinfo">
        <nav aria-label="Footer Navigation">
        <ul style="list-style: none; padding: 0; margin: 0 0 15px 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 24px;">
        <li><a href="${p}privacy.html" accesskey="p" class="${activePage === 'privacy' ? 'active-link' : ''}">Privacy Policy</a></li>
        <li><a href="${p}LICENSE.txt">Read ATLI Public License (v1.0)</a></li>
        <li><a href="${p}newsletter/subscribe.html">Subscribe to Official Dispatches</a></li>
        <li><a href="${p}support-system/index.html">Report Issue / Feedback</a></li>
        <li><a href="${p}support-system/track.html">Track Ticket Status</a></li>
        </ul>
        </nav>
        <p style="margin: 0;">© 2026 Accessible Tech Labs India</p>
        </footer>
        `;
    }
}
customElements.define('atli-footer', AtliFooter);