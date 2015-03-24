define(['facebook'], function(){
  FB.init({
    appId      : '1580376645513631',
  });
  FB.getLoginStatus(function(response) {
    console.log(response);
  });
});
