import Rx from 'rx';
import {h} from '@cycle/dom';
import helpers from './helpers'



function view(state$) {
  return state$.map(state => [
      h('.modal.fade#save-modal',
        h('.modal-dialog.modal-md',
          h('.modal-content', [
            h('.modal-header', h('button.close', {attributes: {'data-dismiss': 'modal'}, innerHTML: '&times;'})),
            h('.modal-body', [
              h('p', 'Where do you want to receive the link to your album ?'),
              h('form#save-form', [
                h('.input-group', [
                  h('span.input-group-addon', '@'),
                  h('input.form-control', {type: 'email', name: 'email', placeholder: 'john@doe.com'}),
                  h('span.input-group-btn',
                    h('button.btn.btn-primary#submit-save-btn', 
                      state.status ?
                        [h('i.fa.fa-heart'), ' Saved'] :
                        [h('i.fa.fa-heart-o'), ' Save']
                    )
                  )
                ]),
              ])
            ]),
            h('.modal-footer')
          ]))),
      state.status < 2 ? '' : h('.alert.alert-info.fade.in#save-alert', [h('i.fa.fa-check'), " Saved"])
    ]);
}


module.exports = function(DOM, HTTP, user, collection, album) {

  let actions = {
    modal$: helpers.btn(DOM, '#save-btn'),
    submit$: helpers.btn(DOM, '#submit-save-btn')
      .map(ev => document.getElementById("save-form").elements['email'].value),
    linkSent$: helpers.jsonPOST(HTTP, /\/users\/\d+\/link\/\d+/),
    albumSaved$: helpers.jsonPOSTResponse(HTTP, /\/save/)
  }

  actions.save$ = Rx.Observable.merge(
      album.state$.filter(a => a.length > 1 && !_.some(a, _.isEmpty)),
      collection.state$.skip(2),
      actions.submit$)
    .debounce(2000)

  actions.modal$.subscribe(ev => {
    $('#save-modal').modal('show');
    $('#save-form input[name=email]').focus();
  });

  actions.submit$.subscribe(email => user.actions.updateUser$.onNext({email: email}));


  let state$ = Rx.Observable.merge(
      actions.linkSent$.map(res => state => _.extend(state, {'status': 1})),
      actions.albumSaved$.map(res => state => _.extend(state, {'status': 2})),
      actions.albumSaved$.delay(2000).map(res => state => _.extend(state, {'status': 0}))
    )
    .startWith({'status': 0})
    .scan(helpers.apply)


  let requests = {
    emailLink$: actions.submit$.withLatestFrom(user.state$, collection.state$,
        (email, user, collection) => ({
          url: '/users/' + user.id + '/link/' + collection.hash,
          method: 'POST',
          // eager: true,
          send: {email}
        })),

    saveAlbum$: actions.save$.withLatestFrom(collection.state$, album.state$, (ev, collection, album) => ({
      url: '/save',
      method: 'POST',
      eager: true,
      send: {collection, album}
    })).filter(req => req.send.collection.id && req.send.collection.hash !== helpers.demoID && req.send.album),
  }
  
  return {
    DOM: view(state$),
    HTTP: requests,
    actions,
  }
}
