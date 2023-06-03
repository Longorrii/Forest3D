export const math = (function() {
    return {
      
      rand_int: function(a, b) {
        return Math.round(Math.random() * (b - a) + a);
      }, 
    };
  })();
  