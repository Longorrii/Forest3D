export const math = (function() {
    return {
      
      rand_int: function(a, b) {
        return Math.round(Math.random() * (b - a) + a);
      },
  
      sat: function(x) {
        return Math.min(Math.max(x, 0.0), 1.0);
      },
  
    };
  })();
  