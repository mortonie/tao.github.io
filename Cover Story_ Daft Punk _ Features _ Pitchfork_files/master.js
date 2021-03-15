var VIDEOS = [];
var COVER_VIDEO = null;


function apply_style(el, name, value) {
    var prefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
    for (var i = 0; i < 5; i++) {
        $(el).css(prefixes[i] + name, value);
    }
}

function get_attribs_obj(elem) {
    var toReturn = [];
    var nodemap = elem.attributes;

    for(var i = 0; i < nodemap.length; i++) {
        var node = nodemap.item(i);
        toReturn[node.nodeName] = node.nodeValue;
    }
    return toReturn;
}

var TitleParallax = Backbone.View.extend({

    initialize: function(options) {
        _.bindAll(this, 'update');

        this.$target = $(this.$el.data('parallax-target'));

        znu.ipo.viewport_lerp(
            this.$el.find('.lerp-a')[0],
            this.$el.find('.lerp-b')[0],
            this.update
        );
    },

    update: function(v) {
        apply_style(this.$target[0], 'transform', 'translate(0px, ' + v * 200 + 'px)');
    }
});

var ParallaxPhoto = Backbone.View.extend({

    initialize: function(options) {
        _.bindAll(this, 'update');

        this.$target = this.$el.find('.photo');

        znu.ipo.viewport_lerp(
            this.$el.find('.lerp-a')[0],
            this.$el.find('.lerp-b')[0],
            this.update
        );
    },

    update: function(v) {
        apply_style(this.$target[0], 'transform', 'translate(0px, ' + (v * -200) + 'px)');
    }
});

var Cull = Backbone.View.extend({
    initialize: function(options) {
        _.bindAll(this, 'update');

        this.target = $(this.$el.data('cull-target'))[0];

        $(window).on('load scroll', this.update);
    },

    update: function() {
        var rect = this.el.getBoundingClientRect();
        var height = window.innerHeight || $(window).height();

        if ((rect.top > height) || (rect.bottom < 0)) {
            this.target.style.display = 'none';
        } else {
            this.target.style.display = '';
        }
    }
});

var InterstitialOpacity = Backbone.View.extend({

    initialize: function(options) {
        _.bindAll(this, 'update');

        this.$target = $(this.$el.data('opacity-target'));
        this.opacityPoint = this.$el.data('opacity-point');

        this.$scroller  = $(this.$el.data('scroller')).length > 0 ?
                             $(this.$el.data('scroller')) :
                             this.$el

        znu.ipo.viewport_lerp(
            this.$scroller.find('.lerp-a')[0],
            this.$scroller.find('.lerp-b')[0],
            this.update
        );
    },

    update: function(v) {
        if(this.opacityPoint == 'bottom-only') {
            var f = znu.ipo.lerp(1, 0.25, v, 0.8, 0.2);

            // fixes weird safari bug with opacity on title.
            if(f == 1) {
                f = .999;
            }
        } else {
            var f = znu.ipo.lerp(0.25, 1, v, 0, 0.2) * znu.ipo.lerp(1, 0.25, v, 0.8, 0.2);
        }
        this.$target.css({opacity: f});
    }
});


/* slideshow */

var Slideshow = Backbone.View.extend({
    initialize: function(options) {
        this.photos = this.$el.find('.photo');
        this.lerp_start = $(this.$el.data('lerp-start'));
        this.lerp_end = $(this.$el.data('lerp-end'));

        for (var i = 0; i < this.photos.length; i++) {
            var photo = this.photos[i];
            var tilt = parseFloat(photo.getAttribute('data-tilt'));
            apply_style(photo, 'transform', 'rotate(' + tilt + 'deg)');
        }

        this.lerp = znu.ipo.viewport_lerp(
            this.lerp_start[0],
            this.lerp_end[0],
            _.bind(this.update, this));
    },

    update: function(v) {
        var duration = 1 / this.photos.length;
        var height = window.innerHeight || $(window).height();

        for (var i = 0; i < this.photos.length; i++) {
            var photo = this.photos[i];
            var visible = znu.ipo.lerp(0, 1, v, duration * i, duration);

            if (visible > 0.5) {
                this.photos.removeClass('visible');
                $(photo).addClass('visible');
            }
        }
    }
});


/* locking panels */

var Locked = Backbone.View.extend({
    initialize: function(options) {
        _.bindAll(this, 'update', 'resize');

        this.attachment = 'top';

        this.$el.css({
            width: $(window).width(),
            height: $(window).height(),
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: -1
        });

        $(window).on('scroll', this.update);
        $(window).on('resize orientationchange', this.resize);
    },

    resize: function() {
        var width = window.innerWidth || $(window).width();
        var height = window.innerHeight || $(window).height();

        this.$el.css({
            width: $(window).width(),
            height: $(window).height()
        });
    },

    update: function() {
        var height = window.innerHeight || $(window).height();
        var rect = this.el.parentNode.getBoundingClientRect();
        var position = this.el.style.position;
        var attachment = this.attachment;

        if ((rect.top > height) || (rect.bottom < 0))
            this.el.style.visibility = 'hidden';
        else
            this.el.style.visibility = 'visible';

        if (rect.top < 0 && rect.bottom > height) {
            if (position != 'fixed')
                this.$el.css('position', 'fixed');
        } else {
            if (position != 'absolute')
                this.$el.css('position', 'absolute');
        }
        if (rect.bottom <= height) {
            if (this.attachment != 'bottom') {
                this.$el.css('top', 'auto');
                this.$el.css('bottom', '0');
            }
            this.attachment = 'bottom';
        } else {
            if (this.attachment != 'top') {
                this.$el.css('top', '0');
                this.$el.css('bottom', 'auto');
            }
            this.attachment = 'top';
        }
    }
});


/* Fixes an element while scrolling horizontally across it */
var HorizontalFixed = Backbone.View.extend({

    initialize: function(options) {
        _.bindAll(this, 'update', 'resize');

        this.$scroller   = $(this.$el.data('scroller'));
        this.$interior   = this.$el.find('.horizontal');
        this.holdPerc    = this.$el.data('hold-perc') || .2;
        this.holdUpper   = .5 + (this.holdPerc / 2);
        this.holdLower   = .5 - (this.holdPerc / 2);
        this.holdDir     = this.$el.data('hold-dir') || 'vertical';
        this.originalZ   = this.$el.css('z-index');

        this.lerp = znu.ipo.viewport_lerp(
            this.$scroller.find('.lerp-a')[0],
            this.$scroller.find('.lerp-b')[0],
            this.update
        );


        $(window).on('resize', this.resize);

        this.interiorWidth = this.$interior.width();

        this.$interior.css({
            'left': this.interiorWidth
        });

        this.lerp.offset = {x: 0, y: .7};
        this.lerp.offscreen = true;

        // call update to get the positioning setting init'ed
        this.update(0);
    },

    resize: function() {
        this.interiorWidth = this.$interior.width();
    },

    update: function(v) {

        if(v > 0) {
            if(v > this.holdLower && v < this.holdUpper) {
                var f = 0;

                if(this.holdDir == 'horizontal') {
                    var translate = 'translate(' + ((v - this.holdLower) * -140) + 'px, 0px)';
                } else {
                    var translate = 'translate(0px,' + ((v - this.holdLower) * 60) + 'px)';
                }
                apply_style(this.$interior.find('.pull-quote-text')[0], 'transform', translate);

                this.$el.css('z-index', this.originalZ);
            } else if(v < this.holdLower) {
                var z = v / (this.holdLower / .5);
                var f = znu.ipo.lerp(this.interiorWidth, -this.interiorWidth, z);

                this.$el.css('z-index', this.originalZ);
            } else {
                // adapted from scale from znu ipo lib
                var z = ((.5 * (v - this.holdUpper)) / .4) + .5;
                var f = znu.ipo.lerp(this.interiorWidth, -this.interiorWidth, z);

                this.$el.css('z-index', 1);
            }

            this.$interior.css({
                'position': 'fixed',
                'left':     f + 'px'
            });
        } else {
            this.$interior.css({
                'position': 'absolute',
                'top': 0,
                'left': -this.interiorWidth
            });
        }
    }

});

/* Binary text replacement */
var BinaryText = Backbone.View.extend({

    initialize: function(options) {
        var self = this;

        _.bindAll(this, 'update', 'updateBinaryStrings', 'replaceCharacter');

        this.$scroller = $(this.$el.data('scroller'));
        this.$paragraphs = this.$el.find('.binary-text-area');

        this.baseParagraphText = this.$paragraphs.map(function(idx, elem) {
            return $(elem).text();
        });

        this.updateInt = null;
        this.letterProbability = 0;
        this.strIdx = -1;

        this.updateBinaryStrings();

        this.lerp = znu.ipo.viewport_lerp(
            this.$scroller.find('.lerp-a')[0],
            this.$scroller.find('.lerp-b')[0],
            this.update
        );
    },

    updateBinaryStrings: function() {
        var self = this;

        this.$paragraphs.each(function(idx, elem) {
            self.strIdx = idx;
            $(elem).text(self.getBinaryTextString($(elem).text()));
        });
    },

    update: function(v) {
        var f = znu.ipo.lerp(0, .995, v, 0, 0.4) * 
                znu.ipo.lerp(.995, 0, v, 0.6, 0.4);

        this.letterProbability = f;

        if(f > 1 || f < 0) {
            clearInterval(this.updateInt);
            this.updateInt = null;
        } else {
            if(!this.updateInt) {
                this.updateInt = setInterval(this.updateBinaryStrings, 250);
            }
        }
    },

    getBinaryTextString: function(str) {
        return str.replace(/[A-Za-z0-9]+?/g, this.replaceCharacter);
    },

    replaceCharacter: function(match, idx, str) {
        if(Math.random() < this.letterProbability) {
            return this.baseParagraphText[this.strIdx].charAt(idx);
        } else {
            return Math.random() < .5 ? '0' : '1';
        }
    }
});

/* Star field functionality */
var StarField =  Backbone.View.extend({

    initialize: function(options) {
        _.bindAll(this, 'update');

        this.imageCount = this.$el.data('star-count');
        this.imagePath  = this.$el.data('star-paths');
        this.$scroller  = $(this.$el.data('scroller')).length > 0 ?
                             $(this.$el.data('scroller')) :
                             this.$el


        this.initStars(this.count);

        this.lerp = znu.ipo.viewport_lerp(
            this.$scroller.find('.lerp-a')[0],
            this.$scroller.find('.lerp-b')[0],
            this.update
        );
    },

    initStars: function() {
        this.$starContainer = $('<div class="star-container" />');

        for(var i = 1; i <= this.imageCount; i++) {
            $newImg = $('<div class="starfield-section"></div>')
                        .css('background-image', 'url(' + this.imagePath.replace('*', i) + ')')
                        .data('parallax', _.random(500, 1000))
                        .data('rotate', _.random(0, 3));
            this.$starContainer.append($newImg);
        }

        this.$el.append(this.$starContainer);
        this.$starContainer.css('overflow', 'hidden');
        this.$stars = this.$el.find('.starfield-section');
    },

    update: function(v) {
        this.$stars.each(function(idx, elem) {
            apply_style(elem, 
                        'transform', 
                        'translate(0px, ' + (parseFloat($(elem).data('parallax')) * v) + 'px) ' + 
                        'rotate(' + ($(elem).data('rotate') * v) + 'deg)');
        });
    }

});


var Preloader =  Backbone.View.extend({

    initialize: function(options) {
        var self = this;

        _.bindAll(this, 'update', 'clearCanvas');

        this.preloaders = [
            new ImagePreload({el: this.el}),
        ];

        if(!(znu.ios.on_ios)) {
            this.preloaders.push(new VideoPreload({el: this.el}));
        }

        this.initVisual();

        this.totalCount = _.reduce(this.preloaders, function(memo, preloader) {
            return memo + preloader.totalCount;
        }, 0);

        this.currentCount = 0;

        this.$el.on('preload_item_complete', this.update);

        $.each(this.preloaders, function(idx, preloader) {
            preloader.preload();
        });
    },

    update: function(evt) {
        this.currentCount++;

        this.drawPercentage(this.currentCount / this.totalCount);

        if(this.currentCount == this.totalCount) {
            this.$el.fadeOut(250);
        }
    },

    initVisual: function() {
        this.baseImage = this.$el.data('base-image');

        this.$baseImage = $('<img>').attr('src', this.baseImage);
        this.$el.append(this.$baseImage);

        this.$preloaderProgress = $('<canvas class="preloader-progress">');
        this.$el.append(this.$preloaderProgress);

        this.canvas    = this.$preloaderProgress[0];
        this.canvasCtx = this.canvas.getContext('2d');

        this.canvas.width = this.$el.width();
        this.canvas.height = this.$el.height();

        this.drawArc(Math.PI, -Math.PI, '#ccc');
    },

    drawArc: function(startAngle, endAngle, color, width) {
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(this.canvas.width / 2 - 1.75,
                           this.canvas.height / 2 - .7,
                           66, 
                           startAngle, 
                           endAngle);
        this.canvasCtx.lineWidth = width;

        this.canvasCtx.strokeStyle = color;
        this.canvasCtx.stroke();
    },

    drawPercentage: function(perc) {
        this.clearCanvas();
        
        var f = znu.ipo.lerp(Math.PI / 2, -3 * Math.PI / 2, perc);
        this.drawArc(Math.PI / 2, f, '#ccc', 19);
        this.drawArc(f, -3 * Math.PI / 2, '#fff', 19);
    },

    clearCanvas: function() {
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

});

var VideoPreload = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'videoReady');

        this.videos = VIDEOS;
        this.totalCount = this.videos.length;
        this.preloadedCount = 0;
    },

    preload: function() {
        var self = this;

        $.each(this.videos, function(idx, vid) {
            if($(vid.el).attr('preload') != 'auto') {
                vid.preload('auto');
                $(vid.el).one('canplaythrough', self.videoReady);
            } else {
                self.videoReady();
            }
        });
    },

    ready: function() {
        this.$el.trigger('preload_complete');
    },

    videoReady: function(evt) {
        this.preloadedCount++;

        this.$el.trigger('preload_item_complete');

        if(this.preloadedCount == this.totalCount) {
            this.ready();
        }
    }
});


var ImagePreload = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'ready', 'imageLoaded');

        this.$images    = $('img[data-img-src]');
        this.totalCount = this.$images.size();

        this.preloadedCount  = 0;
    },

    preload: function() {
        var self = this;

        $('img[data-img-src]').each(function(idx, elem) {
            $(elem).one('load', self.imageLoaded)
                   .attr('src', $(elem).data('img-src'));
        });
    },

    ready: function() {
        this.$el.trigger('preload_complete');
    },

    imageLoaded: function() {
        this.preloadedCount++;

        $(this.el).trigger('preload_item_complete');

        if(this.preloadedCount == this.totalCount) {
            this.ready();
        }
    }
});

/* znu.video extensions */

znu.video.Video.prototype.rect = function() {
    var $el = $(this.el);
    var pos = $el.offset();
    return {
        left:   pos.left,
        top:    pos.top,
        width:  $el.outerWidth(),
        height: $el.outerHeight()
    };
};

znu.video.Video.prototype.preload = function(value) {
    if(value == undefined) {
        value = 'auto';
    }

    this.el.preload = value;
};


/* fireworks */

$(function() {

    znu.ios.swipe_emulation();

    /* normalize type across all browser dimensions */
    znu.type.normalize_type(document.body, 'width', 1 / 68);

    /* enable slideshows */
    $('.slideshow').each(function() {
        new Slideshow({el: this});
    });

    /* enable panel locking */
    $('.locked').each(function() {
        new Locked({el: this});
    });

    $('.cull').each(function() {
        new Cull({el: this});
    });

    $('.title-parallax').each(function() {
        new TitleParallax({el: this});
    });

    $('.parallax-photo').each(function() {
        new ParallaxPhoto({el: this});
    });

    $('.opacity-fade').each(function() {
        new InterstitialOpacity({el: this});
    });

    $('.binary-text').each(function(idx, elem) {
        new BinaryText({el: this});
    });

    /* scale videos */
    $('.video-inner').each(function(idx, elem) {
        var a = znu.scale.autoscale(elem, 'cover', 'absolute');
        $(this).data('autoscale', a);
    });

    $('.autoscale').each(function(idx, elem) {
        var a = znu.scale.autoscale(elem, 'cover');
        $(this).data('autoscale', a);
    });

    // this should be init'ed after autoscale, so don't move above that
    $('.horizontal-fixed').each(function(idx, elem) {
        new HorizontalFixed({el: this});
    });

    $('.starfield').each(function(idx, elem) {
        new StarField({el: this});
    });

    /* fire preloading */
    $('div[preload]').each(function(idx, elem) {
        var $el = $(elem);

        if(znu.ios.on_ios && $el.data('fallback')) {
            $el.replaceWith($('<img>')
                            .attr('src', $el.data('fallback'))
                            .addClass('vid-replace')
                            .load(function(evt) {
                                $(evt.currentTarget)
                                    .css({height: "100%", width: "100%"})
                                    .attr('width', '100%')
                                    .attr('height', '100%')
                            })
                           );
        } else {
            $el = $(elem);

            var v = znu.video.create(
                elem.parentNode,
                $.extend({'loop': 'loop'}, get_attribs_obj(elem)),
                {
                    mp4:  $el.data('mp4-src'),
                    ogg:  $el.data('ogv-src'),
                    webm: $el.data('webm-src')
                },
                $el.data('fallback')
            );

            if(idx == 0) {
                COVER_VIDEO = v;
            }

            VIDEOS.push(v);
            elem.parentNode.removeChild(elem);
        }
    });

    if(!znu.ios.on_ios) {
        $(window).on('scroll resize load', function(evt) {
            var windowScrollTop = $(window).scrollTop();
            var windowHeight    = $(window).height();

            $.each(VIDEOS, function(idx, val) {
                var vidPos = val.rect();

                // pause any videos that are out of view
                if(vidPos.top > (windowScrollTop + windowHeight) || 
                   (vidPos.top + vidPos.height) < windowScrollTop ||
                   $(val.el).parents(':not(:visible)').length > 0) {
                    val.pause();
                } else {
                    val.play();
                }
            });
        });
    }

    if(!znu.ui.svg.enabled()) {
        znu.ui.svg.replace();
    }

    // firefox won't let you scroll when fullscreened
    if (BigScreen.enabled && !navigator.userAgent.match(/firefox/i)) {
        $('#fullscreen').click(function(evt) {
            BigScreen.toggle();
            $(evt.currentTarget).toggleClass('active');
        });
    } else {
        $('#fullscreen').addClass('disabled');
    }

    $('.preloader').each(function() {
        new Preloader({el: this});
    });

    $(window).on('scroll', function(evt) {
        if($(window).scrollTop() <= 0) {
            $('.bouncing-arrow').not(':animated').fadeIn(500);
        } else {
            $('.bouncing-arrow').not(':animated').fadeOut(500);
        }
    });
});
