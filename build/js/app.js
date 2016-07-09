jQuery(function(){
  createSticky(jQuery("#sticky-wrap"));
});

function createSticky(sticky) {
  var pos = 600,
  win = jQuery(window);

  win.on("scroll", function() {

    if( win.scrollTop() > pos ) {
      sticky.addClass("stickyhead");
      sticky.addClass("home").css('display', 'block');
      sticky.addClass("btn-offer").css('display', 'block');

    } else {
      sticky.removeClass("stickyhead");
      sticky.removeClass("home");
    }
  });
}
