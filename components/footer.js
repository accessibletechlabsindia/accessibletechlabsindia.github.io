class AtliFooter extends HTMLElement {
    connectedCallback() {
        let p = this.getAttribute("path") || "";
        let activePage = this.getAttribute("active") || "";
        this.innerHTML = `
        <footer role="contentinfo">
        <p>
        <a href="${p}privacy.html" accesskey="p" class="${activePage === 'privacy' ? 'active-link' : ''}">Privacy Policy</a> | 
        <a href="${p}support-system/index.html">Report Issue / Feedback</a> | 
        <a href="${p}support-system/track.html">Track Ticket Status</a>
        </p>
        <p>© 2026 Accessible Tech Labs India</p>
        </footer>
        `;
    }
}
customElements.define('atli-footer', AtliFooter);