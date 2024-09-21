'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('Boards', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      codigo: {
        type: DataTypes.STRING,
        allowNull: false, // No permite valores nulos
        unique: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false, // No permite valores nulos
        unique: true
      },
      userId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Users', // Nombre de la tabla referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Elimina la relación si el usuario es eliminado
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Boards');
  }
};