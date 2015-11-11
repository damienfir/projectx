import Rx from 'rx';
import {h} from '@cycle/dom';
import {jsonPOST, jsonGET, apply} from './helpers'
let Observable = Rx.Observable;


let fields = ['firstName', 'lastName', 'email', 'address', 'zip', 'city', 'country'];


let extractFields = (fields) => (formID) => {
  let data = document.getElementById(formID).elements;
  return _.mapObject(_.pick(data, fields), (val, key) => val.value);
}


function intent(DOM, HTTP) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault);

  let actions = {
    // formSubmit$: DOM.select('#order-form').events('submit').map(cancelDefault),
    orderModal$: btn('#order-btn'),
    formSubmit$: btn('.submit-order-btn').map('order-form').map(extractFields(fields)),
    formSubmitted$: jsonPOST(HTTP, /\/order/),
    clientToken$: HTTP.filter(res$ => !_.isUndefined(res$.request.url))
      .filter(res$ => res$.request.url.match(/\/client_token/))
      .mergeAll().map(res => res.text).share(),
    nonceReceived$: new Rx.Subject(),
    integrationReady$: new Rx.Subject()
  }

  actions.orderModal$.subscribe(ev => $('#order-modal').modal('show'));
  btn('.close-btn').subscribe(ev => $(ev.target['data-target']).modal('hide'));

  return actions;
}


function model(actions, user, collection) {
  actions.clientToken$.subscribe(clientToken => {
    braintree.setup(clientToken, "dropin", {
      container: "payment-form",
      onPaymentMethodReceived: function(obj) {
        actions.nonceReceived$.onNext(obj);
      },
      onReady: function(obj) {
        actions.integrationReady$.onNext(obj);
      }
    });
  });

  let updateInfos$ = actions.formSubmit$
    .map(info => state => _.extend(state, {info}));

  let clientToken$ = actions.clientToken$.map(token => state => _.extend(state, {token}));

  let hasIntegration$ = actions.integrationReady$.map(obj => state => _.extend(state, {'ready': obj}));

  let submitOrder$ = actions.formSubmit$.map(obj => state => _.extend(state, {'status': -1}));
  let submittedOrder$ = actions.formSubmitted$.map(obj => state => _.extend(state, obj));

  let updateNonce$ = actions.nonceReceived$
    .withLatestFrom(user.state$, collection.state$, (obj, user, collection) =>
        state => _.extend(state, {'order': {'nonce': obj.nonce, 'userID': user.id, 'collectionID': collection.id, 'price': 0}}));

  return Observable.merge(
      clientToken$,
      updateInfos$,
      updateNonce$,
      hasIntegration$,
      submitOrder$,
      submittedOrder$
    ).startWith({}).scan(apply);
}


function requests(actions, state$) {
  return {
    formSubmit$: actions.formSubmit$.withLatestFrom(state$, (ev, state) => ({
      url: '/order',
      method: 'POST',
      send: {info: state.info, order: state.order},
      eager: true
    })),

    clientToken$: actions.orderModal$
      .withLatestFrom(state$, (ev,state) => state.token)
      .filter(_.isUndefined)
      .map({url: '/client_token', 'method': 'GET', 'eager': true})
  }
}


function view(state$) {
  return state$.map(state => h('div', [
    h('.modal.fade#order-modal',
      h('.modal-dialog',
        h('.modal-content', [
          h('.modal-header', ''),
          h('.modal-body', [
            h('form#order-form', [
              h('.row', [
                h('.col-lg-3.form-group', [
                  h('label', {'for': 'firstName'}, 'First Name'),
                  h('input.form-control', {'name': 'firstName', 'placeholder': ''})]),
                h('.col-lg-3.form-group', [
                  h('label', {'for': 'lastName'}, 'Last Name'),
                  h('input.form-control', {'name': 'lastName', 'placeholder': ''})]),
                h('.col-lg-6.form-group', [
                  h('label', {'for': 'email'}, 'Email'),
                  h('.input-group', [
                    h('span.input-group-addon', '@'),
                    h('input.form-control', {'name': 'email', 'type': 'email', 'placeholder': 'name@example.com'})]),
                ])
              ]),
              h('.row', [
                h('.col-lg-12.form-group', [
                  h('label', {'for': 'address'}, 'Address'),
                  h('input.form-control', {'name': 'address', 'placeholder': 'Street & number'})]),
              ]),
              h('.row', [
                h('.col-lg-2.form-group', [
                  h('label', {'for': 'zip'}, 'Zip Code'),
                  h('input.form-control', {'name': 'zip', 'placeholder': ''})]),
                h('.col-lg-5.form-group', [
                  h('label', {'for': 'city'}, 'City'),
                  h('input.form-control', {'name': 'city', 'placeholder': ''})]),
                h('.col-lg-5.form-group', [
                  h('label', {'for': 'country'}, "Country"),
                  h('input.form-control', {'name': 'country', 'disabled': true, 'placeholder': '', 'value': 'CH'})]),
              ])]),

              h('.panel.panel-default', [
                // h('.panel-heading', h('h4.panel-title', "Payment information")),
                h('.panel-body',
                  h('form', [h('div#payment-form'), h('button.btn.btn-info.pull-right#verify-btn', {'disabled': _.isUndefined(state.ready)}, "Validate payment method")]))
              ])
                ]),
                h('.modal-footer', [
                    _.isUndefined(state.status) ? h('.clearfix', [
                      state.order ?
                        h('button.btn.btn-primary.pull-right.submit-order-btn',
                          {'type': 'button'},
                          ['Confirm order ', h('i.fa.fa-check')]) : '',
                      h('button.btn.btn-default.pull-right.close-btn.order-cancel-btn',
                        {'data-target': '#order-modal'},
                        ['Not now ', h('i.fa.fa-times')])]) :
                    h('.alert.alert-info.clearfix', 
                      state.status === -1 ?
                      [
                        h('i.fa.fa-spin.fa-circle-o-notch.pull-right'),
                        " Submitting your order..."
                      ] :
                      [
                        h('.fa.fa-2x.fa-smile-o.pull-right'),
                        h('p', "Your album has been ordered!"),
                        h('p', "You will receive an email to confirm your order, and will be notified when your order has been processed. Thank you!"),
                        h('div', h('button.btn.btn-primary.pull-right.close-btn',
                            {'data-target': '#order-modal'},
                            ["Close ", h('i.fa.fa-times')]))
                      ]
                    )
                ])
      ]))),

      // h('.modal.fade#payment-modal',
      //   h('.modal-dialog',
      //     h('.modal-content', [
      //       h('.modal-header', ''),
      //       h('.modal-body',
      //         h('form', h('div#payment-form'))),
      //       h('.modal-footer', [
      //         h('button.btn.btn-primary.pull-right.submit-payment-btn', ["Continue ", h('i.fa.fa-angle-right')]),
      //         h('button.btn.btn-default.pull-right.close-btn.payment-cancel-btn', {'data-target': '#payment-modal', 'type': 'button'}, ["Not now ", h('i.fa.fa-times')]),
      //         h('button.btn.btn-default.pull-right.payment-back-btn', [h('i.fa.fa-angle-left'), " Back"]),
      //       ])
      //     ])))
      ]));

        // h('.panel.panel-default', [
        //   h('.panel-heading', "Payment"),
        //     h('.panel-body', [
        //       h('.row', [
        //         h('.col-lg-4.form-group', [
        //           // h('label', "Type"),
        //           h('.btn-group', [
        //             h('button.btn.btn-default', h('i.fa.fa-3x.fa-cc-mastercard')),
        //             h('button.btn.btn-default', h('i.fa.fa-3x.fa-cc-visa')),
        //             h('button.btn.btn-default', h('i.fa.fa-3x.fa-cc-amex')),
        //           ])
        //         ]),
        //         h('.col-lg-4.form-group', [
        //           h('label', {'for': 'cc-name'}, "Credit card holder"),
        //           h('input.form-control', {'name': 'cc-name', 'placeholder': 'Full name'})]),
        //     ]),
        //     h('.row', [
        //         h('.col-lg-3.form-group', [
        //           h('label', {'for': 'cc-number'}, "Credit card number"),
        //           h('.input-group', [
        //             h('span.input-group-addon', h('i.fa.fa-credit-card')),
        //             h('input.form-control', {'name': 'cc-number', 'placeholder': '1111-2222-3333-4444'})]),
        //         ]),
        //         h('.col-lg-2.form-group', [
        //           h('label', {'for': 'cc-date'}, 'Expiration date'),
        //           h('input.form-control', {'name': 'cc-date', 'placeholder': 'MM/YY'})]),
        //         h('.col-lg-1.form-group', [
        //           h('label', {'for': 'cc-cvd'}, 'CVV'),
        //           h('input.form-control', {'name': 'cc-verification', 'placeholder': '123'})]),
        //       ])
        //     ])])
}

module.exports = function(DOM, HTTP, user, collection) {

  let actions = intent(DOM, HTTP);
  let state$ = model(actions, user, collection);
  let requests$ = requests(actions, state$);
  let vtree$ = view(state$);

  return {
    DOM: vtree$,
    HTTP: requests$,
    actions
  }
}
