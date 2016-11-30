/*global $, videojs, FuiszEvents*/

(function() {

  var VerticalViv = function($el) {

    let $previewVid = $el.find('.hero .cb-video-player.preview-vid'); // what will be playing when cb is visibe in cb list but not opened yet
    let $pvh = $el.find('.preview-vid-holder');
    let $vidsList = $el.find('.vid-tile .cb-video-player');
    let $closeButton = $el.find('.close-btn');
    let cbId = $el.data('block-id');
    let previewVid,   // the preview vid is what the user sees when scrolling through the content block list
        vidsListInited = false,
        cbIsSelected = false,
        vivIsExpanded = false,
        clonedVids = [],  // we clone all the vids so we can expand them to full-screen without having to remove them from the slick carousel
        posterHeight;  // of the vid in the carousel whose size we need to shrink back to


    // ClickVid = the vid in the horizontal carousel that gets clicked
    // ClonedVid = the clone of the vid in the list that gets expanded to full-screen
    // PreviewVid = the vid that plays by default before the cb is selected

 // listen for selection from CB or layout
    FuiszEvents.on(FuiszEvents.VERTICAL_CB_SELECT, function(e, data) {
      if(data.blockId === cbId) {
        cbIsSelected = true;
        showVidsList();
      }
    })
    FuiszEvents.on(FuiszEvents.VERTICAL_CB_SHRINK, function(e, data) {
      if(data.blockId === cbId) {
        cbIsSelected = false;
        hideVidsList();
      }
    })

    // only need ios inline player on iphones .. ipads can play inline natively
    // NOTE: this changes once iOS10 comes out...
    let isMobileIos = window._fuisz.player.playerType === 'ios' && $(window).width() < 768

    initPreviewVid();

    $closeButton.on('click', shrinkViv);

    // init --------------------------------

    function initPreviewVid() {
      previewVid = new VideoPlayer($previewVid, { "controlBar": false, "autoplay": false }, false);
       $pvh.on('click', function () {
          console.log("clicked the previewVid");
          // don't have to do anything here yet...
          });

       if($previewVid.data('autoplay')===1)
       {
          previewVid.video.pause();
          previewVid.video.play();
       }
    }

    function initVidsList() {
      let index = 0,
          $firstVid,
          $lastVid,
          $vidEl;

      $vidsList.each(function() {
        $vidEl = $(this);
        $vidEl.sequence = index + 1;  // add one because there will an invisible place holder at pos 0

        new VideoPlayer($vidEl, { "controlBar": false, "autoplay": false }, false)

        // set the vid tiles to carousel height
        var $listTile = $vidEl.closest('.vid-tile');
        var carouselHeight = $el.find('.vid-carousel').height();
        $listTile.height(carouselHeight);

        if( index === 0 ) {
          $firstVid = $vidEl.clone();
        }

        let $vidClone = $vidEl.clone();
        clonedVids.push($vidClone);

        $vidClone.on('click', function () {
          togglePlay($vidClone);
        });

        index++;
      })

      // put the vids list in a slick carousel
      var $vidsCarousel = $el.find('.vid-carousel');
      // add an invisible first and last place holder slides to make slick scroll when the number of slidesToShow is equal to the total number of slides
      $vidsCarousel.prepend($firstVid.addClass('invisible'));
      $lastVid = $vidEl.clone();
      $vidsCarousel.append($lastVid.addClass('invisible'));

      $vidsCarousel.slick({
        centerMode: true,
        centerPadding: '60px',
        focusOnSelect: true,
        slidesToShow: 3,
        draggable: true,
        infinite: false
      });

      // switch the text when the vivs list is scrolled
      $vidsCarousel.on('swipe', function(event, slick, direction) {
        var currentSlide  = $vidsCarousel.slick('slickCurrentSlide');
        console.log("current slide is " + currentSlide);
        var $clonedVid = clonedVids[currentSlide-1];
        let contentHeadline = $clonedVid.data('contentHeadline');
        $el.find('.content-headline').html(contentHeadline);
        let contentText = $clonedVid.data('contentText');
        $el.find('.content-text').html(contentText);
      });

      // expand to full-screen on click
      $vidsCarousel.on('click touchstart', function(e) {
        if(!cbIsSelected || vivIsExpanded) return;
        var $vivClicked = $el.find('.slick-current');
        var currentSlide  = $vidsCarousel.slick('slickCurrentSlide');
        var $clonedVid = clonedVids[currentSlide-1];
        expandToFullScreen($vivClicked, $clonedVid)
        $el.find('.close-btn').addClass('active');
        vivIsExpanded = true;
      });
    }


    //  show / hide the list  ----------------------

    function showVidsList() {
      if( !vidsListInited )
      {
        initVidsList();
        vidsListInited = true;
      }
      $pvh.addClass('invisible');
    }

    function hideVidsList() {
      $pvh.removeClass('invisible');
    }

    // video player functions  ---------------------

    function VideoPlayer($vidEl, vjsOptions, isMuted=false) {
      let self = this
      let video = $vidEl[0]
      let sourceWebm = $vidEl.data('webmUrl')
      let sourceMp4 = $vidEl.data('mp4Url')

      this.$el = $vidEl
      this.isVjs = false
      this.lastStatePlaying = false

      // add video sources
      if(isMobileIos) {
        // iphone-inline seems to prefer the src be added this way
        if(sourceMp4) {
          $vidEl.attr('src', sourceMp4)
        } else {
          console.warn('no mp4 specified!');
        }

      } else {
        if(sourceWebm) {
          $('<source>')
            .attr('src', sourceWebm)
            .attr('type', 'video/webm')
            .appendTo($vidEl);
        }
        if(sourceMp4) {
          $('<source>')
            .attr('src', sourceMp4)
            .attr('type', 'video/mp4')
            .appendTo($vidEl);
        }
      }

      // instantiate player
      if(isMobileIos) {
        window.makeVideoPlayableInline(video, !isMuted);
        this.video = video;

        // click to play listener when video isn't muted/autoplay
        if(!isMuted) {
          _.defer(function() {
            $(video).on('touchend', function(e) {
              console.log("touchend event picked up");
              video.paused ? video.play() : video.pause()
            })
          })
        }

      } else {
        videojs(video, vjsOptions, function() {
          self.video = this;
          onVideoReady(self);
        });
      }
    }

    function onVideoReady(videoPlayer) {
      videoPlayer.isVjs = true;
      let $vidEl = videoPlayer.$el;
      let video = videoPlayer.video;

      // the video.js api for bigPlayButton and posterImage isn't working in standalone...
      let $bigPlayButton = $vidEl.siblings('.vjs-big-play-button');

      $bigPlayButton.css("background-image", "url('http://vignette4.wikia.nocookie.net/dccu/images/8/82/Supes.jpg/revision/latest/scale-to-width-down/270?cb=20160407064640')");

      $bigPlayButton.addClass('play-url');

      let $poster = $vidEl.siblings('.vjs-poster');

      $bigPlayButton.show();

        video
          .on('durationchange', function() {
            // init analytics only after the duration has been figured out
            if(video.duration() !== 0) {
              //BlockAnalytics.cbVideoInit(video.duration(), $el.data('itemId'), $el.data('blockId'));
              video.off('durationchange');
            }
          })
          .on('timeupdate', function() {
            //BlockAnalytics.cbVideoTick(video.currentTime(), 'cards_video');
          })
          .on('play', function() {
            video.isPlaying = true;
            $bigPlayButton.hide();
            $poster.hide();
            // mraid doesn't get $poster ... but the vjs api works. shruggie.
            try {
              video.posterImage.hide()
            } catch(e) {}

            FuiszEvents.trigger(FuiszEvents.CB_VIDEO_PLAY);
          })
          .on('pause', function() {
            video.isPlaying = false;
            $bigPlayButton.show();
          })
          .on('ended', function() {
            // rewind and show poster again
            $bigPlayButton.show();
            $poster.show();
            video.currentTime(0);
          })
    }

    function togglePlay($vidEl) {
      let $bigPlayButton = $vidEl.siblings('.vjs-big-play-button');
      if( $vidEl[0].paused ) {
        $vidEl[0].play();
        $bigPlayButton.hide();
      }else {
        $vidEl[0].pause();
        $bigPlayButton.show();
      }
    }

    // shrink / expand -----------------------------------------

    // stick the cloned vid directly on top of the clicked vid then make it grow to full-screen
    function expandToFullScreen($vidClicked, $clonedVid) {
      // NOTE : assuming that for this vertical video block all vids AND posters will be of correct aspect ratio !

      // pause the vid immediately - let play once transition is done
      if(!$clonedVid[0].paused) $clonedVid[0].pause();

      // get global coords of video clicked
      var clickedVidWidth = $vidClicked.width();
      var clickedVidCoords = $vidClicked.offset();
      var pad = ($vidClicked.outerWidth() - $vidClicked.width()) / 2;
      clickedVidCoords.top += pad;
      clickedVidCoords.left += pad;

      // wasn't able to query the global coords of the poster successfully so instead calculate them from the poster image size
      let $poster = $vidClicked.find('.vjs-poster');
      var img = new Image;
      var image_url = $poster.css('background-image');
      image_url = image_url.replace('url', '').replace('(', '').replace(')', '').replace('"', '').replace('"', '');
      img.src = image_url;  //$poster.css('background-image').replace(/url\(|\)$/ig, "");
      var bgImgWidth = img.width;
      var bgImgHeight = img.height;
      var ratio = bgImgHeight / bgImgWidth;
      var actualHeight = $vidClicked.width() * ratio;
      var top = ( $vidClicked.height() - actualHeight ) / 2;

      // put the cloned vid ON TOP of the clicked vid
      $clonedVid
        .css({
          position: "fixed",
          top:    top,
          left:   clickedVidCoords.left,
          width:  clickedVidWidth,
          height: actualHeight
        }).addClass('full-screen').removeClass('no-pointer-events');

      posterHeight = actualHeight; // save this value for shrink

      var cbOuter = $el.find('.cb-outer');
      cbOuter.append($clonedVid);

      // Minimum 50px margin all around (required for MRAID close button)  -- TODO - we still need this?
      var win = window._fuisz.rootEl.ownerDocument.defaultView || window._fuisz.rootEl.ownerDocument.parentWindow;
      var winH = $(win).height(),
          winW = $(win).width();

      $clonedVid
        .one(FuiszEvents.CSS_TRANSITION_END, function() {
          $clonedVid[0].play();
        })
        .css({
          position: "fixed",
          top:    0,
          left:   0,
          width: winW + 'px',
          height: winH + 'px',
          opacity: 1
        })
    }

    // shrink the cloned vid back to ON TOP of the clicked vid then fade it away
    function shrinkViv() {
      $closeButton.removeClass('active');
      vivIsExpanded = false;

      let $clonedVid = $el.find('.full-screen');
      if(!$clonedVid[0].paused)
      {
        $clonedVid[0].pause();
      }

      var $vidClicked = $el.find('.slick-current');
      // get global coords of video clicked
      var clickedVidWidth = $vidClicked.width();
      var clickedVidCoords = $vidClicked.offset();
      var pad = ($vidClicked.outerWidth() - $vidClicked.width()) / 2;
      clickedVidCoords.top += pad;
      clickedVidCoords.left += pad;

      var top = ( $vidClicked.height() - posterHeight ) / 2;

      $clonedVid
        .one(FuiszEvents.CSS_TRANSITION_END, function() {
          $clonedVid.removeClass('full-screen');
        })
        .css({
          top:    top,
          left:   clickedVidCoords.left,
          width:  clickedVidWidth,
          height: posterHeight,
          opacity: 0
        }).addClass('no-pointer-events');
    }
   };

  $('.block-vertical_viv').each(function() {
    new VerticalViv($(this));
  });
})();




