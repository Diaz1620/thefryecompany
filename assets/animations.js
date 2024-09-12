const initAnimations = (section) => {
    const domObject = section || document;

    const fadeIn = domObject.querySelectorAll('.fadeIn'); 
    const cb = function(entries){
        entries.forEach(entry => {
        if(entry.isIntersecting){
            entry.target.classList.add('inview');
        }
        });
    }

    const io = new IntersectionObserver(cb);
    fadeIn.forEach( i =>  io.observe(i));
}

initAnimations();

// Reinitialize observers in reloaded sections in customizer
if (Shopify.designMode) {
    document.addEventListener('shopify:section:load', function(event) {
        const sectionId = `shopify-section-${event.detail.sectionId}`
        const section = document.getElementById(sectionId);
    
        initAnimations(section);
    })
}

const fadeAnimation = (section) => {
    const domObject = section || document;
  
    const fadeIn = domObject.querySelectorAll('.animated'); 

    const cb = function(entries){
        entries.forEach(entry => {
        if(entry.isIntersecting){
            entry.target.classList.add('active');
        }
        });
    }
  
    const io = new IntersectionObserver(cb);
    fadeIn.forEach( i =>  io.observe(i));
  }
  
  fadeAnimation();