// Circular Text Animation (Vanilla JS version with CSS animations)

export class CircularText {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            text: options.text || 'DEX CALL • DEX CALL • DEX CALL • DEX CALL • ',
            spinDuration: options.spinDuration || 20,
            onHover: options.onHover || 'speedUp',
            className: options.className || ''
        };

        this.element = null;
        this.isHovering = false;

        this.init();
    }

    init() {
        // Create circular text element
        this.element = document.createElement('div');
        this.element.className = `circular-text ${this.options.className}`;

        // Set CSS animation duration
        this.element.style.animationDuration = `${this.options.spinDuration}s`;

        // Create letter spans
        const letters = Array.from(this.options.text);
        letters.forEach((letter, i) => {
            const span = document.createElement('span');
            const rotationDeg = (360 / letters.length) * i;

            span.textContent = letter;
            span.style.transform = `rotate(${rotationDeg}deg)`;

            this.element.appendChild(span);
        });

        // Add to container
        this.container.appendChild(this.element);

        // Setup hover events
        this.element.addEventListener('mouseenter', () => this.handleHoverStart());
        this.element.addEventListener('mouseleave', () => this.handleHoverEnd());

        console.log('Circular text initialized with', letters.length, 'letters');
    }

    handleHoverStart() {
        if (!this.options.onHover) return;
        this.isHovering = true;

        let duration = this.options.spinDuration;

        switch (this.options.onHover) {
            case 'slowDown':
                duration = this.options.spinDuration * 2;
                break;
            case 'speedUp':
                duration = this.options.spinDuration / 4;
                break;
            case 'pause':
                this.element.style.animationPlayState = 'paused';
                return;
            case 'goBonkers':
                duration = this.options.spinDuration / 20;
                break;
            default:
                duration = this.options.spinDuration;
        }

        this.element.style.animationDuration = `${duration}s`;
    }

    handleHoverEnd() {
        this.isHovering = false;
        this.element.style.animationPlayState = 'running';
        this.element.style.animationDuration = `${this.options.spinDuration}s`;
    }

    updateText(newText) {
        this.options.text = newText;
        this.element.innerHTML = '';

        const letters = Array.from(newText);
        letters.forEach((letter, i) => {
            const span = document.createElement('span');
            const rotationDeg = (360 / letters.length) * i;

            span.textContent = letter;
            span.style.transform = `rotate(${rotationDeg}deg)`;

            this.element.appendChild(span);
        });
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
