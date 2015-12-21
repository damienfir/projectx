import Rx from 'rx';
import {h} from '@cycle/dom';
import {List, Map, fromJS} from 'immutable';
import {jsonPOST, jsonGET, apply} from './helpers'
import helpers from './helpers'
import i18 from './i18n'
import countries from './countries';
let Observable = Rx.Observable;


let fields = ['firstName', 'lastName', 'email', 'address', 'zip', 'city', 'country'];

let formErrors = (info) => _.mapObject(info, (val, key) => !_.isEmpty(val))

let extractFields = (formID, fields) => {
  let data = document.getElementById(formID).elements;
  return _.mapObject(_.pick(data, fields), (val, key) => val.value);
}


let getQuantity = () => ["qty1"].map(id => document.getElementById(id))
  .filter(el => el.checked)
  .map(el => parseInt(el.value))
  .shift();


function intent(DOM, HTTP) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault);

  let actions = {
    // formSubmit$: DOM.select('#order-form').events('submit').map(cancelDefault),
    orderModal$: btn('#order-btn'),

    formKeyUp$: DOM.select("#order-form input").events("input")
      .debounce(100)
      .map(ev => extractFields('order-form', fields)),

    formSubmit$: btn('.submit-order-btn'),
    // changeQty$: DOM.select('#qty-selector').events('click').map(helpers.cancel).map(el => getQuantity()),
    
    changeQty$: helpers.btn(DOM, '#qty-plus').map(1)
      .merge(helpers.btn(DOM, '#qty-minus').map(-1))
      .scan((acc,val) => acc+val, 0),

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


let basePrice = 29.00;
let tenPagePrice = 5.00;
let additionalAlbumPrice = 25.00;

function qtyToPrice(qty, pages) {
  return basePrice + (qty-1)*additionalAlbumPrice;
}


function model(actions, user, collection, album) {
  actions.clientToken$.subscribe(clientToken => {
    braintree.setup(clientToken, "dropin", {
      container: "payment-form",
      onPaymentMethodReceived: (obj) => actions.nonceReceived$.onNext(obj),
      onReady: (obj) => actions.integrationReady$.onNext(obj)
    });
  });

  let initial = fromJS({order: {'qty': 1}, info: {}});

  let updateInfos$ = actions.formKeyUp$.map(info =>
      state => state.merge({info}));

  let checkForm$ = actions.formKeyUp$.map(formErrors)
    .map(valid =>
      state => state.merge({valid}));

  let clientToken$ = actions.clientToken$.map(token =>
      state => state.merge({token}));

  let hasIntegration$ = actions.integrationReady$.map(ready =>
      state => state.merge({ready}));

  let submitOrder$ = actions.formSubmit$.map(obj =>
      state => state.set('status', -1));

  let submittedOrder$ = actions.formSubmitted$.map(obj =>
      state => state.set('status', obj.status));

  let changedQty$ = actions.changeQty$.map(qty =>
      state => state.setIn(['order', 'qty'], qty).setIn(['order', 'price'], qtyToPrice(qty)));

  let updateNonce$ = actions.nonceReceived$
    .withLatestFrom(user.state$, collection.state$, (obj, user, collection) =>
        state => state.mergeIn(['order'], {
          'nonce': obj.nonce,
          'userID': user.id,
          'collectionID': collection.id,
        }));

  return Observable.merge(
      clientToken$,
      updateInfos$,
      updateNonce$,
      hasIntegration$,
      submitOrder$,
      submittedOrder$,
      checkForm$
    )
    .startWith(initial)
    .scan(apply)
    .shareReplay(1);
}


function requests(actions, state$) {
  return {
    formSubmit$: actions.formSubmit$.withLatestFrom(state$, helpers.argArray)
      .filter(([ev, state]) => !_.isUndefined(state.get('valid')) && state.get('valid').values().every())
      .map(([ev, state]) => ({
        url: '/order',
        method: 'POST',
        send: {info: state.get('info'), order: state.get('order')},
        eager: true
      })),

    clientToken$: actions.orderModal$
      .withLatestFrom(state$, (ev,state) => state.get('token'))
      .filter(_.isUndefined)
      .map({url: '/client_token', 'method': 'GET', 'eager': true})
  }
}


let checkFields = (fields) => (key) => _.isEmpty(fields) ? '' : (fields[key] ? '' : '.has-error')

let countriesOptions = [h('option', {'value':''}, "")]
  .concat(countries.map(c => 
    h('option', {'value': c['Alpha2']}, c['Name'])
  ));

function view(state$) {
  return state$.map(state => {
    let check = checkFields(state.get('valid', Map()).toJS());
    return h('.modal.fade#order-modal',
      h('.modal-dialog.modal-lg',
        h('.modal-content', [
          h('.modal-header', ''),
          h('.modal-body',
            h('.row', [
              h('.col-lg-12', h('.panel.panel-default', [
                  // h('.panel-heading', h('h3.panel-title', "Album details")),
                  h('.panel-body.row', [
                    h('.col-lg-3.form-inline', [
                      h('input.form-control', {
                        'value': '1'
                      }),
                      h('button.btn.btn-primary#qty-minus', h('i.fa.fa-minus')),
                      h('button.btn.btn-primary#qty-plus', h('i.fa.fa-plus')),
                      // h('.btn-group#qty-selector', {'attributes': {'data-toggle': 'buttons'}}, [
                        // h('label.btn.btn-primary.active', [
                        //   h('input#qty1',
                        //     {'type': 'radio', 'name': 'qty', 'value': '1', 'autocomplete': 'off', 'checked': 'checked'}),
                        //   h('h4', [h('i.fa.fa-book'), " 1"]), "CHF 39.00"
                        // ]),
                        // h('label.btn.btn-primary', [
                        //   h('input#qty2', {'type': 'radio', 'name': 'qty', 'value': '3', 'autocomplete': 'off'}),
                        //   h('h4', "3"), "CHF 99.00"
                        // ]),
                        // h('label.btn.btn-primary', [
                        //   h('input#qty3', {'type': 'radio', 'name': 'qty', 'value': '5', 'autocomplete': 'off'}),
                        //   h('h4', "5"), "CHF 169.00"
                        // ]),
                    // ])
                    ]),
                  h('.col-lg-9', [
                      h('p.text-muted', i18('order.desc1')),
                      h('p', i18('order.desc2')),
                      h('p', i18('order.desc3'))
                    ])
                  ])
              ])),

              h('.col-lg-8', h('.panel.panel-default', [
                  // h('.panel-heading', h('h3.panel-title', "Delivery address")),
                  h('form.panel-body#order-form', [
                    h('.row', [

                      h('.col-lg-6.form-group' + check('firstName'), [
                        h('label', {
                          'for': 'firstName'
                        }, i18('order.firstname')),
                        h('input.form-control', {
                          'name': 'firstName',
                          'placeholder': ''
                        })
                      ]),
                      h('.col-lg-6.form-group' + check('lastName'), [
                        h('label', {
                          'for': 'lastName'
                        }, i18('order.lastname')),
                        h('input.form-control', {
                          'name': 'lastName',
                          'placeholder': ''
                        })
                      ]),
                    ]),

                    h('.row', [

                        h('.col-lg-6.form-group' + check('email'), [
                          h('label', {
                            'for': 'email'
                          }, i18('order.email')),
                          h('.input-group', [
                            h('span.input-group-addon', '@'),
                            h('input.form-control', {
                              'name': 'email',
                              'type': 'email',
                              'placeholder': i18('order.email-placeholder')
                            })
                          ]),
                        ]),

                        h('.col-lg-6.form-group' + check('address'), [
                          h('label', {
                            'for': 'address'
                          }, i18('order.address')),
                          h('input.form-control', {
                            'name': 'address',
                            'placeholder': i18('order.street')
                          })
                        ]),
                    ]),

                    h('.row', [

                        h('.col-lg-2.form-group' + check('zip'), [
                          h('label', {
                            'for': 'zip'
                          }, i18('order.zip')),
                          h('input.form-control', {
                            'name': 'zip',
                            'placeholder': ''
                          })
                        ]),

                        h('.col-lg-5.form-group' + check('city'), [
                          h('label', {
                            'for': 'city'
                          }, i18('order.city')),
                          h('input.form-control', {
                            'name': 'city',
                            'placeholder': ''
                          })
                        ]),

                        h('.col-lg-5.form-group' + check('country'), [
                            h('label', {
                              'for': 'country'
                            }, i18('order.country')),
                            h('select.form-control', {
                              'name': 'country'
                            })//, countriesOptions)
                        ]),
                      ])
                    ])
                  ])),

                    h('.col-lg-4', h('.panel.panel-default', [
                        // h('.panel-heading', h('h4.panel-title', "Payment")),
                        h('.panel-body',
                          h('form', [
                            h('div#payment-form'),
                            h('button.btn.btn-info.pull-right#verify-btn', {
                              'disabled': _.isUndefined(state.ready)
                            }, i18('order.validate'))
                          ]))
                    ])),
                    ])),

            h('.modal-footer', [
                _.isUndefined(state.status) ? h('.clearfix', [
                   (_.isUndefined(state.get('order').get('nonce')) || _.isUndefined(state.get('order').get('qty'))) ? '' :
                    h('button.btn.btn-primary.pull-right.submit-order-btn',
                      {'type': 'button', 'disabled': (_.isUndefined(state.get('valid')) || !state.valid.values().every())},
                      ['Purchase ', h('i.fa.fa-check')]),
                  h('button.btn.btn-default.pull-left.close-btn.order-cancel-btn',
                    {'data-target': '#order-modal'},
                    [i18('order.notnow')+' ', h('i.fa.fa-times')])
                ]) :
                h('.alert.alert-info.clearfix', 
                  state.status === -1 ?
                  [
                    h('i.fa.fa-spin.fa-circle-o-notch.pull-right'),
                    " "+i18('order.submitting')
                  ] :
                  [
                    h('.fa.fa-2x.fa-smile-o.pull-right'),
                    h('p', i18('order.ordered')),
                    h('p', i18('order.confirmation')),
                    h('div', h('button.btn.btn-primary.pull-right.close-btn',
                        {'data-target': '#order-modal'},
                        [i18('order.close')+" ", h('i.fa.fa-times')]))
                  ]
                )
            ])
      ])));

  });

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
