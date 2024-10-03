'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('users_boards', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      rol: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'invitado' // valor por defecto
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
      boardId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Boards', // Nombre de la tabla referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Elimina la relación si la pizarra es eliminada
        allowNull: false
      },
      diagramJson: {
        type: DataTypes.TEXT, // Cambiado a TEXT para almacenar JSON
        allowNull: true 
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users_boards');
  }
};
