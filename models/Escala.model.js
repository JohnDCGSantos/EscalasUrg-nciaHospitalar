const { Schema, model } = require('mongoose')

// TODO: Please make sure you edit the User model to whatever makes sense in this case
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

    /*medicos: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Doctor', // Referência ao modelo de Doctor (Médico)
        required: true,
      },
    ],
  },
  {*/
    medicos: [
      {
        medico: {
          type: Schema.Types.ObjectId,
          ref: 'Doctor',
          required: true,
        },
        nomeMedico: {
          type: String, // Adicione o campo de nome do médico
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
  },
  {
    timestamps: true, // Adicionar timestamps para `createdAt` e `updatedAt`
  }
)

const Escala = model('Escala', escalaSchema)

module.exports = Escala
