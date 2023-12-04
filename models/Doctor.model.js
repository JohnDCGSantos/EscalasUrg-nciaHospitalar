const { Schema, model } = require('mongoose')

const doctorSchema = new Schema(
  {
    nome: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
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
    diasDeFerias: [Date],
  },
  {
    timestamps: true,
  }
)

const Doctor = model('Doctor', doctorSchema)

module.exports = Doctor
