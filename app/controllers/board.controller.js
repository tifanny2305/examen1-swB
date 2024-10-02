import Board  from '../../models/board.js'; 
import users_boards from '../../models/user_boards.js';
import { v4 as uuidv4 } from 'uuid'; 
import xmlbuilder from 'xmlbuilder';
import xml2js from 'xml2js';

// 1. Crear una nueva board y convertir al creador en admin
    const createBoard = async (req, res) => {
    try {
      const { name } = req.body;  // `userId` viene del creador (admin) y `nombre` es el nombre de la sala
      const userId = req.user.id;

      // Generar un código único para la board
      const codigo = uuidv4().slice(0, 4).toUpperCase();  // Generar un código de 4 letras aleatorias
  
      // Crear la board en la base de datos
      const board = await Board.create({
        name,
        codigo,
        userId: userId  // Asignar al creador como admin
      });
  
      // Asociar al usuario como admin en la tabla intermedia users_boards
      await users_boards.create({
        userId,
        boardId: board.id,
        rol: 'admin'  // Asignar rol de admin
      });
  
      // Retornar la respuesta con el código y la información de la board
      return res.status(201).json({
        ok: true,
        msg: 'Board creada exitosamente',
        board: {
          id: board.id,
          name: board.name,
          codigo: board.codigo,
          userId: board.userId
        }
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
  };
  
  // 2. Unirse a una board como invitado usando el código
   const joinBoard = async (req, res) => {
    try {
      const { codigo } = req.body;  // `userId` es el ID del usuario que se quiere unir y `codigo` es el código de la sala
      const userId = req.user.id;
      console.log("User ID:", userId);
      
      // Buscar la board por el código
      const board = await Board.findOne({ where: { codigo } });
      if (!board) {
        return res.status(404).json({ ok: false, msg: 'Board no encontrada' });
      }

      // Verificar si el usuario es el creador de la board (admin)
      let rol = 'invitado';
      if (board.userId === userId) {
        rol = 'admin';  // El usuario que creó la sala es el admin
      }
  
      // Asignar al usuario como invitado en la tabla intermedia users_boards
      await users_boards.create({
        userId,
        boardId: board.id,
        rol 
      });
  
      // Retornar la respuesta con la información de la board
      return res.status(200).json({
        ok: true,
        msg: 'Te has unido a la board',
        board: {
          id: board.id,
          name: board.name,
          codigo: board.codigo,
          userId: board.userId,
          rol
        }
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
  };
  
  // 3. Eliminar una board (solo el admin puede hacerlo)
    const deleteBoard = async (req, res) => {
    try {
      const { userId, boardId } = req.body;
  
      // Buscar la board
      const board = await Board.findOne({ where: { id: boardId, adminId: userId } });
      if (!board) {
        return res.status(403).json({ ok: false, msg: 'No tienes permiso para eliminar esta board o no existe' });
      }
  
      // Eliminar la board
      await board.destroy();
  
      // Retornar la respuesta de éxito
      return res.status(200).json({ ok: true, msg: 'Board eliminada exitosamente' });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
};

// Función para remover prefijos de las claves
function normalizeKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys);
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      const normalizedKey = key.replace(/^UML:/, ''); // Elimina el prefijo UML:
      acc[normalizedKey] = normalizeKeys(obj[key]); // Recursivamente aplica la normalización
      return acc;
    }, {});
  }
  return obj;
}

// Función para importar diagramas XMI desde Enterprise Architect
const importDiagram = async (req, res) => {
  try {
    // Verificar que se haya subido el archivo
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    }

    const file = req.files.file;
    console.log('Archivo recibido:', file);
    const parser = new xml2js.Parser();

    // Convertir el contenido del archivo XMI a JSON
    parser.parseString(file.data, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al procesar el archivo XMI' });
      }

      // Normalizamos las claves del JSON resultante
      const normalizedResult = normalizeKeys(result);
      //console.log('Resultado del XML parseado normalizado:', JSON.stringify(normalizedResult, null, 2));

      // Extraer modelo del XMI parseado
      const xmiContent = normalizedResult?.XMI?.['XMI.content']?.[0];
      console.log('Contenido del XMI normalizado:', xmiContent);

      if (!xmiContent || !xmiContent.Model) {
        console.log('Error: Modelo no encontrado en el XML');
        return res.status(400).json({ message: 'Modelo no encontrado en el XML' });
      }

      const model = xmiContent.Model?.[0]; // Asegurarse de acceder correctamente al primer modelo
      console.log('Modelo extraído:', model);

      const classes = [];
      const relationships = [];

      // Acceder a los elementos dentro de Namespace.ownedElement
      const ownedElements = model?.['Namespace.ownedElement']?.[0];
      const packages = ownedElements?.['Package'];

      if (packages && Array.isArray(packages)) {
        packages.forEach((pkg) => {
          const innerOwnedElements = pkg?.['Namespace.ownedElement']?.[0];
          const classElements = innerOwnedElements?.['Class'] || [];  // Asegurarse de que sea un array
          const associationElements = innerOwnedElements?.['Association'] || [];  // Asegurarse de que sea un array

          console.log('Elementos (Clases) encontrados:', classElements);

          if (classElements && Array.isArray(classElements)) {
            classElements.forEach((cls, index) => {
              const attributes = [];
              const methods = [];

              // Extraer atributos
              const features = cls?.['Classifier.feature']?.[0];
              const classAttributes = features?.['Attribute'] || [];
              const classMethods = features?.['Operation'] || [];

              if (classAttributes && Array.isArray(classAttributes)) {
                classAttributes.forEach((attr) => {
                  attributes.push({
                    name: attr['$']?.['name'],
                    type: attr?.['StructuralFeature.type']?.[0]?.['Classifier']?.['$']?.['_xmi.idref'],
                  });
                });
              }

              // Extraer métodos
              if (classMethods && Array.isArray(classMethods)) {
                classMethods.forEach((method) => {
                  methods.push({
                    name: method['$']?.['name'],
                    returnType: method?.['BehavioralFeature.parameter']?.[0]?.['Parameter.type']?.[0]?.['Classifier']?.['$']?.['_xmi.idref'],
                  });
                });
              }

              // Extraer la geometría para las clases (ubicación)
              /*let location = '';
              const classGeometry = diagramElements.find(el => el['$'].subject === cls['$']['xmi.id']);
              if (classGeometry) {
                const [left, top] = extractCoordinates(classGeometry['$'].geometry);
                location = `${left} ${top}`;
              }*/

              classes.push({
                key: cls['$']?.['xmi.id'],
                name: cls['$']?.['name'] || `Clase_${index + 1}`,
                attributes: attributes,
                methods: methods,
                location: '',
              });
            });
          }


          // Crear un mapa entre ea_localid y xmi.id
          const classIdMap = {};
          classElements.forEach((cls) => {
            const eaLocalId = cls['ModelElement.taggedValue']?.[0]?.['TaggedValue']?.find(tagged => tagged['$']?.tag === 'ea_localid')?.['$']?.value;
            if (eaLocalId) {
              classIdMap[eaLocalId] = cls['$']?.['xmi.id'];  // Mapear ea_localid al xmi.id
            }
          });

          // Extraer relaciones (asociaciones/enlaces)
          console.log('Asociaciones encontradas:', associationElements);
          if (associationElements && Array.isArray(associationElements)) {
            associationElements.forEach((assoc) => {
              const taggedValues = assoc['ModelElement.taggedValue']?.[0]?.['TaggedValue'] || [];
              let fromClassId = null;
              let toClassId = null;
              let multiplicityFrom = '';
              let multiplicityTo = '';
              let relationType  = "Association";

              // Extraer los IDs de las clases de origen y destino de los TaggedValues
              taggedValues.forEach((taggedValue) => {
                if (taggedValue['$']?.tag === 'ea_sourceID') {
                  fromClassId = classIdMap[taggedValue['$']?.value];
                }
                if (taggedValue['$']?.tag === 'ea_targetID') {
                  toClassId = classIdMap[taggedValue['$']?.value];
                }
                if (taggedValue['$']?.tag === 'ea_type') {
                  relationType  = taggedValue['$']?.value; 
                }
                if (taggedValue['$']?.tag === 'lb') {
                  multiplicityFrom = taggedValue['$']?.value;
                }
                if (taggedValue['$']?.tag === 'rb') {
                  multiplicityTo = taggedValue['$']?.value;
                }
              });

              let toArrow = "";
              switch (relationType ) {
                case "Association":
                  toArrow = "";  
                  break;
                case "Aggregation":
                  toArrow = "StretchedDiamond"; 
                  break;
                case "Composition":
                  toArrow = "FilledDiamond";  // Flecha para composición "StretchedDiamond",
                  break;
                case "Generalization":
                  toArrow = "RoundedTriangle";
                  break;
              }

              if (fromClassId && toClassId) {
                relationships.push({
                  from: fromClassId,
                  to: toClassId,
                  text: assoc['$']?.['name'] || 'Association',
                  multiplicityFrom: multiplicityFrom,
                  multiplicityTo: multiplicityTo,
                  toArrow: toArrow,
                  relationType: relationType,
                  subject: assoc['$']?.['xmi.id']
                });
              } else {
                console.log('Relación sin clases asociadas:', assoc);
              }
            });
          }
        });
      }

      // Verificar el contenido del XMI y recorrer las etiquetas
      const diagram = xmiContent?.Diagram?.[0]; // Accede a la etiqueta <Diagram>;

      if (!diagram) {
        console.error('No se encontró el diagrama en el XMI.');
        return;
      }

      // Extraer los tagged values (si es necesario)
      const taggedValues = diagram?.['ModelElement.taggedValue']?.[0]?.['TaggedValue'] || [];
      console.log('Tagged values encontrados:', taggedValues);

      // Extraer los elementos dentro de <UML:Diagram.element>
      const diagramElements = diagram?.['Diagram.element']?.[0]?.['DiagramElement'] || [];

      if (!diagramElements.length) {
        console.error('No se encontraron elementos del diagrama.');
      } else {
        console.log('Diagram elements encontrados:', diagramElements);
      }

      // Recorrer cada elemento del diagrama y extraer la geometría
      diagramElements.forEach((element) => {
        const geometry = element['$']?.geometry; // Obtener la geometría
        const subject = element['$']?.subject; // ID de la clase o relación

        if (!geometry) {
          console.warn('Elemento sin geometría:', element);
          return;
        }

        // Si el elemento es una clase
        if (geometry.includes('Left') && geometry.includes('Top')) {
          const [left, top] = extractCoordinates(geometry); // Extraer las coordenadas de clase
          const classData = classes.find(cls => cls.key === subject); // Buscar la clase por su ID
          if (classData) {
            classData.location = `${left} ${top}`; // Ajustar la posición de la clase
            console.log(`Clase ${classData.name} posicionada en: ${classData.location}`);
          } else {
            console.warn('Clase no encontrada para el subject:', subject);
          }
        }

        // Si el elemento es una relación (enlace)
        if (geometry.includes('SX') && geometry.includes('EX')) {
          const linkData = relationships.find(rel => rel.subject === subject); // Buscar la relación por su ID
          if (linkData) {
            const coords = extractLinkCoordinates(geometry); // Extraer las coordenadas de los puertos
            linkData.fromPort = `${coords.fromPort.x}, ${coords.fromPort.y}`;
            linkData.toPort = `${coords.toPort.x}, ${coords.toPort.y}`;
            console.log(`Relación ${linkData.text} posicionada con puertos:`, linkData);
          } else {
            console.warn('Relación no encontrada para el subject:', subject);
          }
        }
      });

      // Función para extraer las coordenadas de las clases desde la geometría
      function extractCoordinates(geometryString) {
        const left = parseFloat(geometryString.match(/Left=(\d+)/)?.[1]);
        const top = parseFloat(geometryString.match(/Top=(\d+)/)?.[1]);
        return [left, top];
      }

      // Función para extraer las coordenadas de los enlaces desde la geometría
      function extractLinkCoordinates(geometryString) {
        const fromPort = {
          x: parseFloat(geometryString.match(/SX=(\d+)/)?.[1]),
          y: parseFloat(geometryString.match(/SY=(\d+)/)?.[1])
        };
        const toPort = {
          x: parseFloat(geometryString.match(/EX=(\d+)/)?.[1]),
          y: parseFloat(geometryString.match(/EY=(\d+)/)?.[1])
        };
        return { fromPort, toPort };
      }

      console.log('Clases extraídas:', classes);
      console.log('Relaciones extraídas:', relationships);

      // Responder con el JSON en el formato compatible con GoJS
      return res.json({
        nodeDataArray: classes,
        linkDataArray: relationships
      });
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

//Exporta JSON a XML
const exportDiagram = async (req, res) => {
  try {
    const diagramData = JSON.parse(req.body.diagram);

    const xml = xmlbuilder.create('XMI', { version: '1.0', encoding: 'UTF-8' })
      .att('xmi.version', '1.1')
      .att('xmlns:xmi', 'http://www.omg.org/XMI')
      .att('xmlns:UML', 'http://www.omg.org/spec/UML/1.3')
      .att('timestamp', new Date().toISOString());

    //Agregar el encabezado
    xml.ele('XMI.header')
      .ele('XMI.documentation')
      .ele('XMI.exporter', 'Custom Exporter').up()
      .ele('XMI.exporterVersion', '1.0').up().up();

    //Crear el modelo
    const model = xml.ele('XMI.content')
      .ele('UML:Model', { 'name': 'Class Model', 'xmi.id': uuidv4() });

    const namespace = model.ele('UML:Namespace.ownedElement');
    const classIds = {};

    //AGREGAR TODAS LAS CLASES
    diagramData.nodeDataArray.forEach((node) => {
      const classId = `class_${node.key}`; 
      classIds[node.key] = classId; 

      const classElement = namespace.ele('UML:Class', {
        'xmi.id': classId,
        'name': node.name,
        'visibility': 'public',
        'isRoot': 'false',
        'isLeaf': 'false',
        'isAbstract': 'false',
        'namespace': 'Model_1',
        'isActive': 'false'
      });

      //Agregar etiquetas adicionales para las clases
      classElement.ele('UML:ModelElement.taggedValue')
        .ele('UML:TaggedValue', { 'tag': 'isSpecification', 'value': 'false' }).up()
        .ele('UML:TaggedValue', { 'tag': 'ea_stype', 'value': 'Class' }).up()
        .ele('UML:TaggedValue', { 'tag': 'ea_ntype', 'value': '0' }).up()
        .ele('UML:TaggedValue', { 'tag': 'linecolor', 'value': '-1' }).up()
        .ele('UML:TaggedValue', { 'tag': 'bordercolor', 'value': '-1' }).up()
        .ele('UML:TaggedValue', { 'tag': 'fontcolor', 'value': '-1' }).up()
        .ele('UML:TaggedValue', { 'tag': 'ea_type', 'value': 'Class' }).up()
        .ele('UML:TaggedValue', { 'tag': 'package', 'value': 'Model_1' }).up();

      //Agregar atributos y métodos en UML:Classifier.feature
      const classifierFeature = classElement.ele('UML:Classifier.feature');

      //Agregar atributos
      if (node.attributes && node.attributes.length) {
        node.attributes.forEach(attr => {
          classifierFeature.ele('UML:Attribute', {
            'xmi.id': `attr_${uuidv4()}`,
            'name': attr.name,
            'visibility': 'public'
          });
        });
      } /*else {
        classifierFeature.ele('UML:Attribute', { 'xmi.id': `attr_placeholder_${node.key}`, 'name': 'placeholderAttr', 'visibility': 'public' });
      }*/

      //Agregar métodos
      if (node.methods && node.methods.length) {
        node.methods.forEach(method => {
          classifierFeature.ele('UML:Operation', {
            'xmi.id': `meth_${uuidv4()}`,
            'name': method.name,
            'visibility': 'public'
          });
        });
      } /*else {
        classifierFeature.ele('UML:Operation', { 'xmi.id': `meth_placeholder_${node.key}`, 'name': 'placeholderMethod', 'visibility': 'public' });
      }*/
    });

    //AGREGAR TODAS LAS RELACIONES
    diagramData.linkDataArray.forEach((link, index) => {
      const assocId = `assoc_${index}`;

      const association = namespace.ele('UML:Association', {
        'xmi.id': assocId,
        'name': link.text || link.relationType || 'Association',
        'visibility': 'public',
        'isRoot': 'false',
        'isLeaf': 'false',
        'isAbstract': 'false'
      });

      //Agregar etiquetas de la asociación
      association.ele('UML:ModelElement.taggedValue')
        .ele('UML:TaggedValue', { 'tag': 'ea_type', 'value': link.relationType || 'Association' }).up();

      //Agregar el resto de la estructura de asociación
      const associationConnection = association.ele('UML:Association.connection');
      associationConnection.ele('UML:AssociationEnd', {
        'xmi.idref': classIds[link.from],
        'type': classIds[link.from],
        'multiplicity': link.multiplicityFrom || '1',
        'visibility': 'public',
        'aggregation': 'none',
        'isOrdered': 'false',
        'isNavigable': 'true',
        'targetScope': 'instance',
        'changeable': 'none'
      }).ele('UML:ModelElement.taggedValue')
        .ele('UML:TaggedValue', { 'tag': 'containment', 'value': 'Unspecified' }).up()
        .ele('UML:TaggedValue', { 'tag': 'deststyle', 'value': 'Union=0;Derived=0;AllowDuplicates=0;Owned=0;Navigable=Unspecified;' }).up()
        .ele('UML:TaggedValue', { 'tag': 'ea_end', 'value': 'source' }).up();

      associationConnection.ele('UML:AssociationEnd', {
        'xmi.idref': classIds[link.to], 
        'type': classIds[link.to],
        'multiplicity': link.multiplicityTo || '1',
        'visibility': 'public',
        'aggregation': 'none',
        'isOrdered': 'false',
        'isNavigable': 'true',
        'changeable': 'none'
      }).ele('UML:ModelElement.taggedValue')
        .ele('UML:TaggedValue', { 'tag': 'containment', 'value': 'Unspecified' }).up()
        .ele('UML:TaggedValue', { 'tag': 'deststyle', 'value': 'Union=0;Derived=0;AllowDuplicates=0;Owned=0;Navigable=Unspecified;' }).up()
        .ele('UML:TaggedValue', { 'tag': 'ea_end', 'value': 'target' }).up();

      //Verificar si los puertos están presentes antes de usar split
      if (link.fromPort && link.toPort) {
        const [sx, sy] = link.fromPort.split(',');
        const [ex, ey] = link.toPort.split(',');

        model.ele('UML:DiagramElement', {
          'subject': assocId,
          'xmi.id': `diagramElement_assoc_${index}`,
          'geometry': `SX=${sx};SY=${sy};EX=${ex};EY=${ey};EDGE=2;`,
          'style': `Mode=3;SOID=class_${link.from};EOID=class_${link.to};Color=-1;LWidth=0;Hidden=0;`
        });
      } else {
        console.warn(`Puertos no definidos para el enlace ${index}`);
      }
    });

    //AGREGAR EL DIAGRAMA UML
    const owner = diagramData.packageId || 'Model_1';
    const packageId = diagramData.package || 'EAPK_DEFAULT_ID';

    const umlDiagram  = model.ele('UML:Diagram', {
      'xmi.id': `EAID_${uuidv4()}`,
      'name': 'Class Model',
      'diagramType': 'ClassDiagram',
      'owner': owner,
      'toolName': 'Enterprise Architect 2.5'
    });

    //Agregar propiedades dentro de UML:ModelElement.taggedValue
    umlDiagram.ele('UML:ModelElement.taggedValue')
      .ele('UML:TaggedValue', { 'tag': 'version', 'value': '1.0' }).up()
      .ele('UML:TaggedValue', { 'tag': 'author', 'value': 'Custom User' }).up()
      .ele('UML:TaggedValue', { 'tag': 'created_date', 'value': new Date().toISOString()  }).up()
      .ele('UML:TaggedValue', { 'tag': 'modified_date', 'value': new Date().toISOString() }).up()
      .ele('UML:TaggedValue', { 'tag': 'package', 'value': packageId }).up()
      .ele('UML:TaggedValue', { 'tag': 'type', 'value': 'Logical' }).up()
      .ele('UML:TaggedValue', { 'tag': 'ea_localid', 'value': '4' }).up()
      .ele('UML:TaggedValue', { 'tag': 'EAStyle', 'value': 'ShowPrivate=1;ShowProtected=1;ShowPublic=1;' }).up()
      .ele('UML:TaggedValue', { 'tag': 'styleex', 'value': 'SaveTag=362E3F14;ExcludeRTF=0;' }).up();

    //Crear elementos del diagrama
    const diagramElement = umlDiagram .ele('UML:Diagram.element');

    //Posicionar las clases dentro del diagrama
    diagramData.nodeDataArray.forEach((node) => {
      const classId = classIds[node.key]; 
      if (node.location) {
        const [x, y] = node.location.split(',');

        diagramElement.ele('UML:DiagramElement', {
          'subject': classId,
          'xmi.id': `diagramElement_${uuidv4()}`,
          'geometry': `Left=${x};Top=${y};Right=${parseFloat(x) + 100};Bottom=${parseFloat(y) + 100}`,
          'style': `DUID=generated-${node.key};BackColor=-1;BorderColor=-1;FontColor=-1;`
        });
      } else {
        console.warn(`La posición no está definida para el nodo ${node.key}`);
      }
    });

    //Convertir el XML a string y enviarlo como respuesta
    const xmlString = xml.end({ pretty: true });
    res.setHeader('Content-Type', 'application/xml');
    res.send(xmlString);

  } catch (error) {
    console.error('Error al exportar el diagrama:', error);
    res.status(500).json({ message: 'Error al exportar el diagrama' });
  }
};

export const BoardController = {
    createBoard,
    joinBoard,
    deleteBoard, 
    exportDiagram,
    importDiagram
}