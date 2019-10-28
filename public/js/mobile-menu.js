var header = document.getElementsByTagName('header')[0];
  document.getElementById('mobile-menu').addEventListener('click', function() {
     if(header.classList.contains('header-mobile-show')) {
          header.classList.remove('header-mobile-show');
      } else {
          header.classList.add('header-mobile-show');
      } 
  });