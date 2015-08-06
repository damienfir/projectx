var valid_formats = ['image/jpeg', 'image/png'];

function validateFileType(file) {
  return valid_formats.indexOf(file.type) != -1;
}

function getValidFiles(files) {
  var valid_files = [];
  for (var i = 0; i < files.length; i++) {
    if(validateFileType(files[i])) valid_files.push(files[i]);
  }
  return valid_files;
}

function isEmpty(obj) { for (var p in obj) {return false;} return true; }

function compare_min(a,b) { return a-b; }
function compare_max(a,b) { return b-a; }
