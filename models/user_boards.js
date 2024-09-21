import { sequelize } from '../config/pg.js';
import { Model, DataTypes } from 'sequelize';

  class users_boards extends Model {
    
    static associate(models) {
      users_boards.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
  
      // Define la relación con el modelo Board
      users_boards.belongsTo(models.Board, {
        foreignKey: 'boardId',
        as: 'board'
      });
    }
  }
  users_boards.init({
    rol: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    boardId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'users_boards',
  });

  export default users_boards;