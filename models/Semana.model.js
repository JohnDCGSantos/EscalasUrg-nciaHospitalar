const { Schema, model } = require('mongoose')

const semanaSchema = new Schema({
  medicos: [
    {
      medico: {
        type: Schema.Types.ObjectId,
        ref: 'Doctor', // Referência ao modelo de Doctor (Médico)
      },
      dia: {
        type: Date,
      },
      turno: {
        type: String,
        enum: ['dia', 'noite'],
      },
    },
  ],
})

const Semana = model('Semana', semanaSchema)

module.exports = Semana
