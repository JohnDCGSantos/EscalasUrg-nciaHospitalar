const { Schema, model } = require('mongoose')

// TODO: Please make sure you edit the User model to whatever makes sense in this case
const doctorSchema = new Schema(
  {
    nome: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    historicoFerias: [
      {
        dataInicio: {
          type: Date,
        },
        dataFim: {
          type: Date,
        },
      },
    ],
    diasDeFerias: [Date], // Novo campo para armazenar os dias de férias
  },
  {
    timestamps: true, // Adicionar timestamps para `createdAt` e `updatedAt`
  }
)

const Doctor = model('Doctor', doctorSchema)

module.exports = Doctor
