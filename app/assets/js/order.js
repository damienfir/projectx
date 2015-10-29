import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
import {jsonPOST, jsonGET} from './helpers'
let Observable = Rx.Observable;


function intent(DOM, HTTP) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault);

  let actions = {
    // formSubmit$: DOM.select('#order-form').events('submit').map(cancelDefault),
    order$: btn('#order-btn'),
    formSubmit$: btn('.submit-order-btn'),
    formSubmitted$: jsonPOST(HTTP, /\/order/),
    clientToken$: HTTP.filter(res$ => !_.isUndefined(res$.request.url)).filter(res$ => res$.request.url.match(/\/client_token/)).mergeAll().map(res => res.body).share()
  }

  actions.formSubmit$.subscribe(ev => $('#order-modal').modal('hide'));
  actions.formSubmitted$.subscribe(ev => $('#payment-modal').modal('show'));
  actions.order$.subscribe(ev => $('#order-modal').modal('show'));
  btn('.close-btn').subscribe(ev => $(ev.target['data-target']).modal('hide'));
  btn('.payment-back-btn').subscribe(ev => {
    $('#payment-modal').modal('hide');
    $('#order-modal').modal('show');
  });

  return actions;
}


function model(actions) {
  let clientToken$ = actions.clientToken$.do(x => console.log(x));

  actions.formSubmitted$.withLatestFrom(clientToken$, (ev, clientToken) => {
    if (!_.isUndefined(clientToken)) {
      braintree.setup(clientToken, "dropin", {
        container: "payment-form"
      });
    }
  }).subscribe();
}


function requests(actions) {
  return {
    formSubmit$: actions.formSubmit$.map(ev => ({
      url: '/order',
      method: 'POST',
      send: {}
    })),

    clientToken$: actions.order$.map({url: '/client_token', 'method': 'GET', 'eager': true})
  }
}


function view() {
  return Observable.just(h('div', [
    h('.modal.fade#order-modal',
      h('.modal-dialog',
        h('.modal-content', [
          h('.modal-header', ''),
          h('.modal-body', [
            h('form#order-form', [
              h('.row', [
                h('.col-lg-6.form-group', [
                  h('label', {'for': 'name'}, 'Full Name'),
                  h('input.form-control', {'name': 'name', 'placeholder': ''})]),
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
                  h('input.form-control', {'name': 'country', 'disabled': true, 'placeholder': '', 'value': 'Switzerland'})]),
              ])])]),
          h('.modal-footer', [
            h('button.btn.btn-primary.pull-right.submit-order-btn', {'type': 'button'}, ['Continue ', h('i.fa.fa-angle-right')]),
            h('button.btn.btn-default.pull-right.close-btn.order-cancel-btn', {'data-target': '#order-modal'}, ['Not now ', h('i.fa.fa-times')]),
          ])
      ]))),

      h('.modal.fade#payment-modal',
        h('.modal-dialog',
          h('.modal-content', [
            h('.modal-header', ''),
            h('.modal-body',
              h('form', h('div#payment-form'))),
            h('.modal-footer', [
              h('button.btn.btn-primary.pull-right', ["Confirm ", h('i.fa.fa-check')]),
              h('button.btn.btn-default.pull-right.close-btn.payment-cancel-btn', {'data-target': '#payment-modal', 'type': 'button'}, ["Not now ", h('i.fa.fa-times')]),
              h('button.btn.btn-default.pull-right.payment-back-btn', [h('i.fa.fa-angle-left'), " Back"]),
            ])
          ])))
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

module.exports = function(DOM, HTTP) {

  let actions = intent(DOM, HTTP);
  model(actions);
  let requests$ = requests(actions);
  let vtree$ = view();

  return {
    DOM: vtree$,
    HTTP: requests$,
    actions
  }
}
