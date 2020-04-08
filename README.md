# Virtual Keyboard
Zero-dependency DAW-like (Ableton/Bitwig style) virtual piano keyboard.

![keyboard]("./assets/keyboard.png")

**A** to **L** represent white keys.

**W** to **O** represent black keys.

**Z** changes one octave down

**X** changes one octave up

**C** decreases velocity

**V** increases velocity



## Usage

```html
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <code id="output"></p>
  <script src="./src/index.js"></script>
  <script>
    const output = document.getElementById('output')

    new VirtualKeyBoard()
      .subscribe(data => {
        output.innerText += JSON.stringify(data) + '\n'
      })

  </script>
</body>
</html>
```
