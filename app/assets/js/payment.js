import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
let Observable = Rx.Observable;


function intent(DOM) {
  // DOM.select('')
}


function view() {
  return Observable.just(
        h('.modal',
          h('.modal-dialog',
            h('.modal-content', 
          h('form', [

              h('.modal-header', ''),
              h('.modal-body', [

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
            ])
              ]),
            h('.modal-footer', h('button.btn.btn-primary.pull-right', ['Continue ', h('i.fa.fa-angle-right')]))
            ]))))
          );

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

module.exports = function(DOM) {

  let actions = intent(DOM);

  let vtree$ = view();

  return {
    DOM: vtree$
  }
}
