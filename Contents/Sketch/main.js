function getArtboards(currentPage) {
  var artboards = currentPage.artboards();
  var res = [];
  for(var i = 0; i < artboards.count(); i++) {
    res.push(artboards[i]);
  }
  return res;
}

function getEnabledFillColor(layer) {
  var colors = [];
  if (layer.textColor) {
      colors.push(layer.textColor());
      return colors;
  } else if (layer.style) {
    var fills = layer.style().fills();
    for (var i = 0; i < fills.count(); i++) {
      var fill = fills[i];
      if (fill.isEnabled()) {
        colors.push(fill.color());
      }
    }
    return colors;
  }
}

function convertColor2Text(color) {
  // To get value as `String` I use toLowerCase instead of `toString`.
  // `toString` does not return string....
  return color.treeAsDictionary().value.toLowerCase();
}

function getColoredLayers(artboards, clses) {
  // [layer]
  var res = [];
  
  function layerLoop(layers) {
    for (var k = 0; k < layers.count(); k++) {
      var layer = layers[k];
      if (layer.class() === MSLayerGroup) {
        layerLoop(layer.layers());
      } else if (layer.class() === MSTextLayer || getEnabledFillColor(layer).length) {
        if (clses.includes(layer.class())) {
          res.push(layer);
        }
      }
    }
  }

  if (!artboards.length) {
    return layers;
  }
  for (var i = 0; i < artboards.length; i++) {
    layerLoop(artboards[i].layers());
  }
  return res;
}

function createAlertModal(message) {
  var userInterface = COSAlertWindow.new();
  userInterface.setMessageText(message);
  return userInterface;
}

function createColorModal(colors) {
  var userInterface = COSAlertWindow.new();
  userInterface.setMessageText('Color Finder');
  userInterface.setInformativeText('Check color(s) you want to select.');
  colors.forEach(function(color, i) {
    var checkbox = NSButton.alloc().initWithFrame(NSMakeRect( 0, i * 24, 300, 18 ));
    checkbox.setButtonType(NSSwitchButton);
    checkbox.setTitle(convertColor2Text(color));
    checkbox.setState(false);
    checkbox.setBackgroundColor(color);
    userInterface.addAccessoryView(checkbox);
  });
  userInterface.addButtonWithTitle('Select');
  userInterface.addButtonWithTitle('Cancel');
  return userInterface;
}

function createModalFactory(colors) {
  if (colors.length) {
    return createColorModal(colors);
  } else {
    return createAlertModal('There is nothing colored layer.');
  }
}

function getSelectedColor(modal) {
  return modal.views().reduce(function(list, button) {
    if (button.state()) {
      list.push(button.title().toString().toLowerCase()); 
    }
    return list;
  }, []);
}

function selectLayersByColor(layers, selectedColors) {
  layers.forEach(function(layer) {
    var layerColors = getEnabledFillColor(layer);
    layerColors.forEach(function(layerColor) {
      selectedColors.forEach(function(selectedColor) {
        if (convertColor2Text(layerColor) === selectedColor) {
          layer.select_byExpandingSelection(true, true);
        }
      });
    });
  });
}


function findBy(context, types) {
  var page = context.document.currentPage();
  var artboards = getArtboards(page);
  var layers = getColoredLayers(artboards, types);
  var colorTexts = new Set(); // todo refactor
  var colors  = layers.reduce(function(set, layer) {
    getEnabledFillColor(layer).forEach(function(color) {
      if (!colorTexts.has(convertColor2Text(color))) {
        colorTexts.add(convertColor2Text(color));
        set.add(color);
      }
    });
    return set;
  }, new Set());
  var modal = createModalFactory([...colors]);
  var response = modal.runModal();
  // cancel
  if (response !== 1000) {
    return;
  }
  // ok
  var colors = getSelectedColor(modal);
  page.deselectAllLayers();
  selectLayersByColor(layers, colors);
}

function findByAll(context) {
  findBy(context, [MSTextLayer, MSShapeGroup]);
}
function findByFontColor(context) {
  findBy(context, [MSTextLayer]);
}
function findByShapeColor(context) {
  findBy(context, [MSShapeGroup]);
}
