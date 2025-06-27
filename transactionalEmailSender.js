const nodemailer = require('nodemailer')
const fs = require('fs').promises
const path = require('path')
const handlebars = require('handlebars')

class TransactionalEmailSender {
  constructor() {
    const {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_SECURE = 'false',
      EMAIL_USER,
      EMAIL_PASS,
      EMAIL_FROM
    } = process.env

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS || !EMAIL_FROM) {
      throw new Error('Missing email configuration in environment variables')
    }

    const port = parseInt(EMAIL_PORT, 10)
    if (isNaN(port) || port <= 0) {
      throw new Error(`Invalid EMAIL_PORT value: ${EMAIL_PORT}`)
    }

    this.from = EMAIL_FROM
    this.transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: port,
      secure: EMAIL_SECURE === 'true',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    })
    this.templateCache = {}
    this.templateDir = path.resolve(__dirname, 'emailTemplates')
  }

  async sendEmail({ to, subject, templateName, context = {}, text, attachments = [] }) {
    if (!to || !subject) {
      throw new Error('sendEmail requires "to" and "subject"')
    }
    if (!text && !templateName) {
      throw new Error('sendEmail requires at least one of "text" or "templateName"')
    }

    let html
    if (templateName) {
      html = await this.renderTemplate(templateName, context)
    }

    const bodyText = text ? text : html ? this.stripHtml(html) : undefined

    const mailOptions = {
      from: this.from,
      to,
      subject,
      text: bodyText,
      html,
      attachments
    }

    return this.transporter.sendMail(mailOptions)
  }

  async renderTemplate(name, context) {
    const tpl = await this.loadTemplate(name)
    return tpl(context)
  }

  async loadTemplate(name) {
    if (this.templateCache[name]) {
      return this.templateCache[name]
    }
    const filePath = path.join(this.templateDir, `${name}.hbs`)
    let content
    try {
      content = await fs.readFile(filePath, 'utf8')
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Email template "${name}" not found at path ${filePath}`)
      }
      throw err
    }
    const compiled = handlebars.compile(content)
    this.templateCache[name] = compiled
    return compiled
  }

  stripHtml(html) {
    return html.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim()
  }
}

module.exports = new TransactionalEmailSender()