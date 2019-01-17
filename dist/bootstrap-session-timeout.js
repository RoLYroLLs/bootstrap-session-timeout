﻿/*
 * bootstrap-session-timeout
 * www.orangehilldev.com
 *
 * Copyright (c) 2014 Vedran Opacic
 * Licensed under the MIT license.
 */

(function($) {
    /*jshint multistr: true */
    'use strict';
    $.sessionTimeout = function(options) {
        var defaults = {
            title: 'Your Session is About to Expire!',
            message: 'Your session is about to expire.',
            logoutButton: 'Logout',
            logoutButtonClass: 'btn-default',
            keepAliveButton: 'Stay Connected',
            keepAliveButtonClass: 'btn-primary',
            keepAliveUrl: '/keep-alive',
            ajaxType: 'POST',
            ajaxData: '',
            redirUrl: '/timed-out',
            logoutUrl: '/log-out',
            checkInterval: 10000, // 10 seconds
            warnAfter: 900000, // 15 minutes
            redirAfter: 1200000, // 20 minutes
            keepAliveInterval: 5000, // 5 seconds
            keepAlive: true,
            ignoreUserActivity: false,
            onStart: false,
            onWarn: false,
            onRedir: false,
            countdownMessage: false,
            countdownBar: false,
            countdownSmart: false,
            countdownHolderClass: 'countdown-holder',
            forceButtonClick: false,
            modalClass: 'modal-lg',
        };

        var opt = defaults,
            startTime,
            timer,
            countdown = {};

        // Extend user-set options over defaults
        if (options) {
            opt = $.extend(defaults, options);
        }

        // Some error handling if options are miss-configured
        if (opt.warnAfter >= opt.redirAfter) {
            console.error('Bootstrap-session-timeout plugin is miss-configured. Option "redirAfter" must be equal or greater than "warnAfter".');
            return false;
        }

        // Unless user set his own callback function, prepare bootstrap modal elements and events
        if (typeof opt.onWarn !== 'function') {
            // If opt.countdownMessage is defined add a coundown timer message to the modal dialog
            var countdownMessage = opt.countdownMessage ?
                opt.countdownMessage.replace(/{timer}/g, '<span class="' + opt.countdownHolderClass + '"></span>') : '';
            var coundownBarHtml = opt.countdownBar ?
                '<div class="progress"> \
                  <div class="progress-bar progress-bar-striped countdown-bar active" role="progressbar" style="min-width: 15px; width: 100%;"> \
                    <span class="' + opt.countdownHolderClass + '"></span> \
                  </div> \
                </div>' : '';

            // Create timeout warning dialog
            $('body').append('<div class="modal fade" id="session-timeout-dialog"' + (opt.forceButtonClick ?  ' data-backdrop="static" data-keyboard="false"' : '') + '> \
              <div class="modal-dialog ' + opt.modalClass + '"> \
                <div class="modal-content"> \
                  <div class="modal-header"> \
                    ' + (opt.forceButtonClick ? '' : '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>') + ' \
                    <h4 class="modal-title">' + opt.title + '</h4> \
                  </div> \
                  <div class="modal-body"> \
                    ' + opt.message + ' \
                    ' + countdownMessage + ' \
                    ' + coundownBarHtml + ' \
                  </div> \
                  <div class="modal-footer"> \
                    <button id="session-timeout-dialog-logout" type="button" class="btn ' + opt.logoutButtonClass + '">' + opt.logoutButton + '</button> \
                    <button id="session-timeout-dialog-keepalive" type="button" class="btn ' + opt.keepAliveButtonClass + '" data-dismiss="modal">' + opt.keepAliveButton + '</button> \
                  </div> \
                </div> \
              </div> \
             </div>');

            // "Logout" button click
            $('#session-timeout-dialog-logout').on('click', function() {
                logout();
            });
            // "Stay Connected" button click
            $('#session-timeout-dialog').on('hide.bs.modal', function() {
                // Restart session timer
                startSessionTimer();
            });
        }

        // Reset timer on any of these events
        if (!opt.ignoreUserActivity) {
            var mousePosition = [-1, -1];
            $(document).on('keyup mouseup mousemove touchend touchmove', function(e) {
                if (e.type === 'mousemove') {
                    // Solves mousemove even when mouse not moving issue on Chrome:
                    // https://code.google.com/p/chromium/issues/detail?id=241476
                    if (e.clientX === mousePosition[0] && e.clientY === mousePosition[1]) {
                        return;
                    }
                    mousePosition[0] = e.clientX;
                    mousePosition[1] = e.clientY;
                }
                startSessionTimer();

                // If they moved the mouse not only reset the counter
                // but remove the modal too!
                if ($('#session-timeout-dialog').length > 0 &&
                    $('#session-timeout-dialog').data('bs.modal') &&
                    $('#session-timeout-dialog').data('bs.modal').isShown) {
                    // http://stackoverflow.com/questions/11519660/twitter-bootstrap-modal-backdrop-doesnt-disappear
                    $('#session-timeout-dialog').modal('hide');
                    $('body').removeClass('modal-open');
                    $('div.modal-backdrop').remove();

                }
            });
        }

        // Keeps the server side connection live, by pinging url set in keepAliveUrl option.
        // KeepAlivePinged is a helper var to ensure the functionality of the keepAliveInterval option
        var keepAlivePinged = false;

        function keepAlive() {
            if (!keepAlivePinged) {
                // Ping keepalive URL using (if provided) data and type from options
                $.ajax({
                    type: opt.ajaxType,
                    url: opt.keepAliveUrl,
                    data: opt.ajaxData
                });
                keepAlivePinged = true;
                setTimeout(function() {
                    keepAlivePinged = false;
                }, opt.keepAliveInterval);
            }
        }

        function logout() {
            window.location = opt.logoutUrl;
        }

        function redirect() {
            // Check for onRedir callback function and if there is none, launch redirect
            if (typeof opt.onRedir !== 'function') {
                window.location = opt.redirUrl;
            } else {
                opt.onRedir(opt);
            }
        }

        function showDialog() {
            // Check for onWarn callback function and if there is none, launch dialog
            if (typeof opt.onWarn !== 'function') {
                $('#session-timeout-dialog').modal('show');
            } else {
                opt.onWarn(opt);
            }
            // Start dialog timer
            startDialogTimer();
        }

        function startTimer() {
            timer = setInterval(function () {
                var secondsSinceStart = (new Date().getTime() - startTime);

                if (secondsSinceStart >= opt.redirAfter) {
                    // Too much time has passed, redirect
                    redirect();
                } else if (secondsSinceStart >= opt.warnAfter) {
                    // Show the warning dialog
                    showDialog();
                }
            }, opt.checkInterval);
        }

        function startSessionTimer() {
            // Clear session timer
            clearInterval(timer);
            if (opt.countdownMessage || opt.countdownBar) {
                startCountdownTimer('session', true);
            }

            if (typeof opt.onStart === 'function') {
                opt.onStart(opt);
            }

            // If keepAlive option is set to "true", ping the "keepAliveUrl" url
            if (opt.keepAlive) {
                keepAlive();
            }

            startTime = new Date().getTime();

            startTimer();
        }

        function startDialogTimer() {
            if (!$('#session-timeout-dialog').hasClass('in') && (opt.countdownMessage || opt.countdownBar)) {
                // If warning dialog is not already open and either opt.countdownMessage
                // or opt.countdownBar are set start countdown
                startCountdownTimer('dialog', true);
            }
        }

        function startCountdownTimer(type, reset) {
            // Clear countdown timer
            clearTimeout(countdown.timer);

            if (type === 'dialog' && reset) {
                // If triggered by startDialogTimer start warning countdown
                countdown.timeLeft = Math.floor((opt.redirAfter - opt.warnAfter) / 1000);
            } else if (type === 'session' && reset) {
                // If triggered by startSessionTimer start full countdown
                // (this is needed if user doesn't close the warning dialog)
                countdown.timeLeft = Math.floor(opt.redirAfter / 1000);
            }
            // If opt.countdownBar is true, calculate remaining time percentage
            if (opt.countdownBar && type === 'dialog') {
                countdown.percentLeft = Math.floor(countdown.timeLeft / ((opt.redirAfter - opt.warnAfter) / 1000) * 100);
            } else if (opt.countdownBar && type === 'session') {
                countdown.percentLeft = Math.floor(countdown.timeLeft / (opt.redirAfter / 1000) * 100);
            }
            // Set countdown message time value
            var countdownEl = $('.' + opt.countdownHolderClass);
            var secondsLeft = countdown.timeLeft >= 0 ? countdown.timeLeft : 0;
            if (opt.countdownSmart) {
                var minLeft = Math.floor(secondsLeft / 60);
                var secRemain = secondsLeft % 60;
                var countTxt = minLeft > 0 ? minLeft + 'm' : '';
                if (countTxt.length > 0) {
                    countTxt += ' ';
                }
                countTxt += secRemain + 's';
                countdownEl.text(countTxt);
            } else {
                countdownEl.text(secondsLeft + "s");
            }

            // Set countdown message time value
            if (opt.countdownBar) {
                $('.countdown-bar').css('width', countdown.percentLeft + '%');
            }

            // Countdown by one second
            countdown.timeLeft = countdown.timeLeft - 1;
            countdown.timer = setTimeout(function() {
                // Call self after one second
                startCountdownTimer(type);
            }, 1000);
        }

        // Start session timer
        startSessionTimer();
    };
})(jQuery);