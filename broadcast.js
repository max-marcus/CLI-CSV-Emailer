#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const csv = require('csv');
const fs = require('fs');
const async = require('async');

// command line program definition/declaration
program
  .version('0.0.1')
  .option('-l, --list [list]', 'list of emails in CSV file')
  .parse(process.argv);

// runtime user inputs
const questions = [
  {
    type: "input",
    name: "sender.email",
    message: "Sender's email address - "
  },
  {
    type: "input",
    name: "sender.name",
    message: "Sender's name - "
  },
  {
    type: "input",
    name: "subject",
    message: "Subject line - "
  },
  {
    type: "input",
    name: "content",
    message: "Email content (advised to copy/paste) - "
  }
];

const contactList = [];

// sendGrid setup to send emails
function __sendEmail(to, from, subject, content, callback) {
  const helper = require('sendgrid').mail;
  const fromEmail = new helper.Email(from.email, from.name);
  const toEmail = new helper.Email(to.email, to.name);
  const body = new helper.Content("text/plain", content);
  const mail = new helper.Mail(fromEmail, subject, toEmail, body);

  const key = require('sendgrid')(process.env.SENDGRID_API_KEY);
  const request = key.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON(),
  });

  key.API(request, function (err, response) {
    if (err) { return callback(err); }
    callback();
  });
};


// file system read stream and parse csv
const parse = csv.parse;
const stream = fs.createReadStream(program.list)
  .pipe(parse({ delimiter: ',' }));

stream
  .on('error', function(err) {
    return console.error(err.message);
  })
  .on('data', function(data) {
    let name = data[0] + ' ' + data[1];
    let email = data[2];
    contactList.push({ name, email });
  })
  .on('end', function () {
    inquirer.prompt(questions)
      .then(function(answer) {
        async.each(contactList, function(recipient, fn) {
          __sendEmail(recipient, answer.sender, answer.subject, answer.content, fn);
        }, function (err) {
          if (err) {
            return console.error(chalk.red(err));
          }
          console.log(chalk.green('Success'));
        });
      });
  });
