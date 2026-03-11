document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('install-modal');
    const openBtns = document.querySelectorAll('.btn-install-modal');
    const closeBtn = document.querySelector('.modal-close');

    // Funciones
    const openModal = (e) => {
        e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevenir scroll al abrir
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    // Eventos
    openBtns.forEach(btn => {
        btn.addEventListener('click', openModal);
    });

    closeBtn.addEventListener('click', closeModal);

    // Cerrar al hacer clic fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Cerrar con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    console.log("Monexa Landing JS initialized.");
});
