import { sequelize } from '../config/pg.js';
import { Model, DataTypes } from 'sequelize';

class User extends Model {
  static associate(models) {
    // Relación uno a muchos: Un usuario puede tener varias asociaciones en User_Board
    User.hasMany(models.User_Board, {
      foreignKey: 'userId',  // La columna que relaciona User con User_Board
      as: 'boards'           // Alias para identificar la relación
    });

    // Relación muchos a muchos: Un usuario puede unirse a muchas boards como participante
    User.belongsToMany(models.Board, {
      through: models.User_Board,
      foreignKey: 'userId',
      otherKey: 'boardId',
      as: 'joinedBoards'
    });
  }
}

// Inicializar el modelo User con sus atributos
User.init({
  username: DataTypes.STRING,
  password: DataTypes.STRING
}, {
  sequelize,
  modelName: 'User',
});

export default User;