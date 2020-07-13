/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import '/extlib/l10n.js';
//import RichConfirm from '/extlib/RichConfirm.js';

import {
  configs,
  log
} from '/common/common.js';

import * as Constants from '/common/constants.js';
import * as Dialog from '/common/dialog.js';

let mParams;

const mTopMessage          = document.querySelector('#top-message');
const mInternalsAllCheck   = document.querySelector('#internalsAll');
const mInternalsList       = document.querySelector('#internals');
const mExternalsAllCheck   = document.querySelector('#externalsAll');
const mExternalsList       = document.querySelector('#externals');
const mSubjectCheck        = document.querySelector('#subject');
const mSubjectField        = document.querySelector('#subjectField');
const mBodyCheck           = document.querySelector('#body');
const mBodyField           = document.querySelector('#bodyField');
const mAttachmentsAllCheck = document.querySelector('#attachmentsAll');
const mAttachmentsList     = document.querySelector('#attachments');
const mAcceptButton        = document.querySelector('#accept');
const mCancelButton        = document.querySelector('#cancel');

configs.$loaded.then(async () => {
  mParams = await Dialog.getParams();

  document.documentElement.classList.toggle('debug', configs.debug);

  mTopMessage.textContent = configs.topMessage;
  mTopMessage.classList.toggle('hidden', !configs.topMessage);

  initInternals();
  initExternals();
  initBodyBlock();
  initAttachments();

  mAcceptButton.disabled = !isAllChecked();
  document.addEventListener('change', _event => {
    mAcceptButton.disabled = !isAllChecked();
  });

  Dialog.initButton(mAcceptButton, async _event => {
    if (!isAllChecked())
      return;

    if (!(await confirmAttentionDomains()))
      return;

    if (!(await confirmAttentionSuffixes()))
      return;

    Dialog.accept();
  });
  Dialog.initCancelButton(mCancelButton);

  Dialog.notifyReady();
});

function initInternals() {
  mInternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllInternals);
  mInternalsAllCheck.addEventListener('change', _event => {
    checkAll(mInternalsList, mInternalsAllCheck.checked);
  });
  mInternalsList.addEventListener('change', _event => {
    mInternalsAllCheck.checked = isAllChecked(mInternalsList);
  });
  for (const recipient of mParams.internals) {
    mInternalsList.appendChild(createRecipientRow(recipient.type, recipient.recipient));
  }
}

function initExternals() {
  mExternalsAllCheck.classList.toggle('hidden', !configs.allowCheckAllExternals);
  mExternalsAllCheck.addEventListener('change', _event => {
    checkAll(mExternalsList, mExternalsAllCheck.checked);
  });
  mExternalsList.addEventListener('change', event => {
    const row = event.target.closest('.row');
    const domainRow = mExternalsList.querySelector(`.domain[data-domain="${row.dataset.domain}"]`);
    const recipientCheckboxes = mExternalsList.querySelectorAll(`.recipient[data-domain="${row.dataset.domain}"] input[type="checkbox"]`);
    domainRow.classList.toggle('checked', Array.from(recipientCheckboxes).every(checkbox => checkbox.checked));
    mExternalsAllCheck.checked = isAllChecked(mExternalsList);
  });

  const recipientsOfDomain = new Map();
  for (const recipient of mParams.externals) {
    const recipients = recipientsOfDomain.get(recipient.domain) || [];
    recipients.push(recipient);
    recipientsOfDomain.set(recipient.domain, recipients);
  }

  for (const domain of recipientsOfDomain.keys()) {
    mExternalsList.appendChild(createDomainRow(domain));
    for (const recipient of recipientsOfDomain.get(domain)) {
      const row = createRecipientRow(recipient.type, recipient.recipient);
      row.dataset.domain = domain;
      mExternalsList.appendChild(row);
    }
  }
}

function initBodyBlock() {
  mSubjectCheck.closest('div').classList.toggle('hidden', !configs.requireCheckSubject);
  mSubjectField.textContent = mParams.details.subject;

  mBodyCheck.closest('div').classList.toggle('hidden', !configs.requireCheckBody);
  mBodyField.src = `data:text/html,${encodeURIComponent(mParams.details.body)}`;

  for (const bodyBlockElements of document.querySelectorAll('#bodyAndSubjectContainer, #bodyAndSubjectContainer + hr')) {
    bodyBlockElements.classList.toggle('hidden', !configs.requireCheckSubject && !configs.requireCheckBody);
  }
}

function initAttachments() {
  mAttachmentsAllCheck.disabled = configs.requireReinputAttachmentNames;
  mAttachmentsAllCheck.classList.toggle('hidden', !configs.allowCheckAllAttachments);
  mAttachmentsAllCheck.addEventListener('change', _event => {
    checkAll(mAttachmentsList, mAttachmentsAllCheck.checked);
  });
  mAttachmentsList.addEventListener('change', _event => {
    mAttachmentsAllCheck.checked = isAllChecked(mAttachmentsList);
  });
  for (const attachment of mParams.attachments) {
    mAttachmentsList.appendChild(createAttachmentRow(attachment));
  }
}

function createRecipientRow(type, address) {
  const row = createCheckableRow([`${type}:`, address]);
  row.setAttribute('title', `${type}: ${address}`);
  row.classList.add('recipient');
  row.lastChild.classList.add('flexible');
  return row;
}

function createDomainRow(domain) {
  const row = createRow([domain]);
  row.setAttribute('title', domain);
  row.classList.add('domain');
  row.dataset.domain = domain;
  row.lastChild.classList.add('flexible');
  return row;
}

let mCreatedInputFieldCount = 0;

function createAttachmentRow(attachment) {
  const row = createCheckableRow([attachment.name]);
  row.setAttribute('title', attachment.name);
  row.classList.add('attachment');
  row.lastChild.classList.add('flexible');

  if (configs.requireReinputAttachmentNames) {
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.disabled = true;

    const column = row.insertBefore(document.createElement('span'), row.querySelector('label'));
    column.classList.add('column');
    column.classList.add('flexible');

    const field = column.appendChild(document.createElement('input'));
    field.id = `input-field-created-${mCreatedInputFieldCount++}`;
    field.type = 'text';
    field.placeholder = browser.i18n.getMessage('confirmDialogAttachmentNameReinputPlaceholder');
    field.addEventListener('input', () => {
      if (checkbox.checked == (field.value == attachment.name))
        return;

      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new CustomEvent('change', {
        detail:     checkbox.checked,
        bubbles:    true,
        cancelable: false,
        composed:   true
      }));
    });

    for (const label of row.querySelectorAll('label')) {
      label.setAttribute('for', field.id);
    }
  }

  return row;
}

let mCreatedCheckboxCount = 0;

function createCheckableRow(columns) {
  const row = createRow(columns);
  const checkbox = row.insertBefore(document.createElement('input'), row.firstChild);
  checkbox.id = `checkbox-created-${mCreatedCheckboxCount++}`;
  checkbox.type = 'checkbox';
  for (const label of row.querySelectorAll('label')) {
    label.setAttribute('for', checkbox.id);
  }
  return row;
}

function createRow(columns) {
  const row = document.createElement('div');
  row.classList.add('row');
  for (const column of columns) {
    const label = row.appendChild(document.createElement('label'));
    label.appendChild(document.createElement('span')).textContent = column;
    label.classList.add('column');
  }
  return row;
}

function checkAll(container, checked) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) {
    checkbox.checked = checked;
  }
}

function isAllChecked(container = document) {
  for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) {
    if (checkbox.classList.contains('hidden') ||
        checkbox.closest('.hidden'))
      continue;
    if (!checkbox.checked)
      return false;
  }
  return true;
}


async function confirmAttentionDomains() {
  const mode = configs.attentionDomainsConfirmationMode;
  const shouldConfirm = (
    mode == Constants.ATTENTION_CONFIRMATION_MODE_ALWAYS ||
    mode == Constants.ATTENTION_CONFIRMATION_MODE_ONLY_WITH_ATTACHMENTS && mParams.attachments.length > 0
  );
  log('confirmAttentionDomains shouldConfirm = ', shouldConfirm);
  if (!shouldConfirm)
    return true;

  const attentionDomains = new Set(configs.attentionDomains);
  const attentionRecipients = mParams.externals.filter(recipient => attentionDomains.has(recipient.domain)).map(recipient => recipient.address);
  log('confirmAttentionDomains attentionRecipients = ', attentionRecipients);
  if (attentionRecipients.length == 0)
    return true;

  return window.confirm(browser.i18n.getMessage('confirmAttentionDomainsMessage', [attentionRecipients.join('\n')]));
  /*
  let result;
  try {
    result = await RichConfirm.showInPopup(mParams.windowId, {
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: browser.i18n.getMessage('confirmAttentionDomainsTitle'),
      message: browser.i18n.getMessage('confirmAttentionDomainsMessage', [attentionRecipients.join('\n')]),
      buttons: [
        browser.i18n.getMessage('confirmAttentionDomainsAccept'),
        browser.i18n.getMessage('confirmAttentionDomainsCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmAttentionDomains result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
  */
}

async function confirmAttentionSuffixes() {
  log('confirmAttentionSuffixes shouldConfirm = ', configs.attentionSuffixesConfirm);
  if (!configs.attentionSuffixesConfirm)
    return true;

  const attentionSuffixesMatcher = new RegExp(`\\.(${configs.attentionSuffixes.map(suffix => suffix.toLowerCase().replace(/^\./, '')).join('|')})$`, 'i');
  const attentionAttachments = mParams.attachments.filter(attachment => attentionSuffixesMatcher.test(attachment.name)).map(attachment => attachment.name);
  log('confirmAttentionSuffixes attentionAttachments = ', attentionAttachments);
  if (attentionAttachments.length == 0)
    return true;

  return window.confirm(browser.i18n.getMessage('confirmAttentionSuffixesMessage', [attentionAttachments.join('\n')]));
  /*
  let result;
  try {
    result = await RichConfirm.showInPopup(mParams.windowId, {
      modal: true,
      type:  'common-dialog',
      url:   '/resources/blank.html',
      title: browser.i18n.getMessage('confirmAttentionSuffixesTitle'),
      message: browser.i18n.getMessage('confirmAttentionSuffixesMessage', [attentionAttachments.join('\n')]),
      buttons: [
        browser.i18n.getMessage('confirmAttentionSuffixesAccept'),
        browser.i18n.getMessage('confirmAttentionSuffixesCancel')
      ]
    });
  }
  catch(_error) {
    result = { buttonIndex: -1 };
  }
  log('confirmAttentionSuffixes result.buttonIndex = ', result.buttonIndex);
  switch (result.buttonIndex) {
    case 0:
      return true;
    default:
      return false;
  }
  */
}
