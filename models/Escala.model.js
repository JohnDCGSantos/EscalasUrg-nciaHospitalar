const { Schema, model } = require('mongoose')

const escalaSchema = new Schema(
  {
    dataInicio: {
      type: Date,
      required: true,
    },
    dataFim: {
      type: Date,
      required: true,
    },

    medicos: [
      {
        medico: {
          type: Schema.Types.ObjectId,
          ref: 'Doctor',
          required: true,
        },
        nomeMedico: {
          type: String,
        },
        diasDeFerias: [{ type: Date }],

        dia: {
          type: Date,
        },
        turno: {
          type: String,
          enum: ['dia', 'noite', 'diaHospB'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

const Escala = model('Escala', escalaSchema)

module.exports = Escala
