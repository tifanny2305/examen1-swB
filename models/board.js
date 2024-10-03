import { sequelize } from '../config/pg.js';
import { Model, DataTypes } from 'sequelize';

  class Board extends Model {

    static associate(models) {
      // Relación uno a muchos: Un board pertenece a un administrador (user)
      Board.belongsTo(models.User, {
        foreignKey: 'adminId',
        as: 'admin'
      });

      // Relación muchos a muchos: Un board puede tener muchos usuarios invitados
      Board.belongsToMany(models.User, {
        through: models.users_boards,
        foreignKey: 'boardId',
        otherKey: 'userId',
        as: 'participants'
      });
    }
  }

  Board.init({
    name: DataTypes.STRING,
    codigo: DataTypes.STRING,
    userId: DataTypes.INTEGER
  }, 
  {
    sequelize,
    modelName: 'Board',
  });

  export default Board;