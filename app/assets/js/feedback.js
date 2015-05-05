define(function(require){
  
  var $ = require("jquery");
  var ga = require("ga");
  var backend = require("backend");

  function Feedback() {
    var questionEl = $("#feedback-question");
    var choicesEl = $("#feedback-choices");
    var panel = $("#feedback-panel");
    var questions = [];
    var currentQuestion;

    function showQuestion(question) {
      currentQuestion = question._id;
      questionEl.html(question.question);
      choicesEl.empty();
      for (var i = 0; i < question.choices.length; i++) {
        var btn = $("<button></button>").addClass("btn btn-primary").data("index", i).html(question.choices[i]);
        choicesEl.append(btn);
      }
    }

    function showForm() {
      choicesEl.empty();
      questionEl.html("<p>Thank you for your feedback !</p>");
      var textarea = $("<textarea class='form-control' placeholder='Let us know if you have anything else to add'></textarea>");
      var submitButton = $('<button class="btn btn-primary btn-block">Send</button>');
      submitButton.click(function(){
        backend.textFeedback(textarea.val()).then(function() {
          panel.find(".panel-title").html("Thank you!");
          panel.removeClass("panel-primary").addClass("panel-success");
          pullDown(panel);
        });
        submitButton.html("Thank you").attr("disabled","true");
        ga("send", "event", "feedback", "submitted-text");
      });
      questionEl.append($("<div class='form-group'></div>").append(textarea), submitButton);
      textarea.focus();
    }

    function nextQuestion() {
      if (questions.length > 0) {
        showQuestion(questions.shift());
      } else {
        showForm();
      }
    }

    this.submitFeedback = function(ev) {
      backend.feedback(currentQuestion, $(ev.target).data("index"));
      nextQuestion();
      ga("send", "event", "feedback", "answered-question");
    };

    this.show = function() {
      backend.questions().then(function(list){
        questions = JSON.parse(list);
        questions = questions.slice(0, Math.min(3, questions.length));
        if (questions.length) panel.fadeIn(800);
        nextQuestion();
      });
    };

    this.hide = function() { panel.fadeOut(); };

    choicesEl.on("click", "button", this.submitFeedback);

    function pullDown(element) {
      element.css("bottom", "-"+(element.height()-35)+"px");
    }

    panel.hover(
        function(){
          $(this).css("bottom", "-10px");
          ga("send", "event", "feedback", "opened-panel");
        },
        function(){ pullDown($(this)); }
        );
  }

  return new Feedback();
});
