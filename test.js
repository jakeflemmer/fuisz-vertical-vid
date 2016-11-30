describe('Vertical Video-in-Video Content Block', function() {

  it('Should dispatch `viv_started` analytics event upon starting', function(done) {
    setTimeout(function() {
      $('.block-video .cb-video-player').each(function(index) {
        //click each video to start play
        $(this).trigger('click');
      });
    }, 250);

    window._fuisz.beacon.on('fuisz-**-track', function(payload) {
      if(payload.event === 'viv_started') {
        done();
      }
    });

  })
})
