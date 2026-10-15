class AtliHeader extends HTMLElement {
    connectedCallback() {
        let p = this.getAttribute("path") || "";
        let activePage = this.getAttribute("active") || "";
        this.innerHTML = `
        <header role="banner">
        <h1 class="center-text">Accessible Tech Labs India</h1>
        <img src="${p}images/logo-of-accessible-tech-labs-india-ATLI.png" alt="Accessible Tech Labs India Logo" width="120" style="display:block; margin: 10px auto;">
        <nav aria-label="Main navigation">
        <a href="${p}index.html" accesskey="h" class="${activePage === 'home' ? 'active-link' : ''}">Home</a>
        <a href="${p}software.html" accesskey="s" class="${activePage === 'software' ? 'active-link' : ''}">Software</a>
        <a href="${p}Addons/Addons.html" accesskey="n" class="${activePage === 'addons' ? 'active-link' : ''}">NVDA Add-ons</a>
        <a href="${p}tools.html" accesskey="t" class="${activePage === 'tools' ? 'active-link' : ''}">Tools</a>
        <a href="${p}Games.html" accesskey="g" class="${activePage === 'games' ? 'active-link' : ''}">Games</a>
        <a href="${p}training.html" accesskey="r" class="${activePage === 'training' ? 'active-link' : ''}">Training</a>
        <a href="${p}support.html" accesskey="d" class="${activePage === 'support' ? 'active-link' : ''}">Support Us</a>
        <a href="${p}about.html" accesskey="a" class="${activePage === 'about' ? 'active-link' : ''}">About</a>
        <a href="${p}contact.html" accesskey="c" class="${activePage === 'contact' ? 'active-link' : ''}">Contact</a>
        </nav>
        </header>
        `;
    }
}
customElements.define('atli-header', AtliHeader);