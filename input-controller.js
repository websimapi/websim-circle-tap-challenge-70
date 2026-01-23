export class InputController {
    constructor(game, interactionCallback) {
        this.game = game;
        this.onInteraction = interactionCallback;
        this._tapHandler = this._tapHandler.bind(this);
        this._spacebarHandler = this._spacebarHandler.bind(this);
    }

    init() {
        window.addEventListener('pointerdown', this._tapHandler);
        window.addEventListener('keydown', this._spacebarHandler);
    }

    _tapHandler(e) {
        // Prevent game tap if clicking music toggle
        if (e.target.closest('#music-toggle-btn')) return;

        if (e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            this.game.handleTap();
        }
    }

    _spacebarHandler(e) {
        if (e.code === 'Space') {
            const focusedElement = document.activeElement;
            // If an element that expects text input is focused (e.g., the page input), don't trigger game tap.
            if (
                focusedElement && 
                (focusedElement.tagName === 'INPUT' && focusedElement.type !== 'submit' && focusedElement.type !== 'button' && focusedElement.type !== 'reset' || 
                 focusedElement.tagName === 'TEXTAREA')
            ) {
                return;
            }

            e.preventDefault();
            if (this.onInteraction) this.onInteraction();
            this.game.handleTap();
        }
    }

    cleanup() {
        window.removeEventListener('pointerdown', this._tapHandler);
        window.removeEventListener('keydown', this._spacebarHandler);
    }
}