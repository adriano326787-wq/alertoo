Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 1600
$outDir = 'C:\Users\adria\road-events\play-store-assets\screenshots\tablet'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Draw-MapIcon {
    param($g, $cx, $cy, $size, $color)
    # Pin shape: circle on top, triangle pointing down
    $r = [int]($size * 0.38)
    $br = New-Object System.Drawing.SolidBrush($color)
    $pen = New-Object System.Drawing.Pen($color, 3)
    # Circle
    $g.FillEllipse($br, $cx - $r, $cy - $size/2, $r*2, $r*2)
    # Triangle body
    $pts = @(
        [System.Drawing.Point]::new($cx - $r, $cy - $size/2 + $r*2 - 4),
        [System.Drawing.Point]::new($cx + $r, $cy - $size/2 + $r*2 - 4),
        [System.Drawing.Point]::new($cx,        $cy + $size/2)
    )
    $g.FillPolygon($br, $pts)
    # Inner white dot
    $wbr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $ir = [int]($r * 0.45)
    $g.FillEllipse($wbr, $cx - $ir, $cy - $size/2 + $r - $ir, $ir*2, $ir*2)
    $br.Dispose(); $wbr.Dispose(); $pen.Dispose()
}

function Draw-AlertIcon {
    param($g, $cx, $cy, $size, $color)
    # Triangle with ! inside
    $br = New-Object System.Drawing.SolidBrush($color)
    $h = [int]($size * 0.9)
    $pts = @(
        [System.Drawing.Point]::new($cx, $cy - $h/2),
        [System.Drawing.Point]::new($cx + $h*0.58, $cy + $h/2),
        [System.Drawing.Point]::new($cx - $h*0.58, $cy + $h/2)
    )
    $g.FillPolygon($br, $pts)
    $wbr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30,30,50))
    $fnt = New-Object System.Drawing.Font('Segoe UI', [int]($size*0.38), [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = [System.Drawing.RectangleF]::new($cx - $h*0.58, $cy - $h/2, $h*1.16, $h)
    $g.DrawString('!', $fnt, $wbr, $rect, $sf)
    $br.Dispose(); $wbr.Dispose(); $fnt.Dispose()
}

function Draw-StarIcon {
    param($g, $cx, $cy, $size, $color)
    $br = New-Object System.Drawing.SolidBrush($color)
    $pts = [System.Collections.Generic.List[System.Drawing.Point]]::new()
    $n = 5; $outer = $size/2; $inner = $size/4
    for ($i = 0; $i -lt $n*2; $i++) {
        $angle = ($i * [Math]::PI / $n) - [Math]::PI/2
        $r2 = if ($i % 2 -eq 0) { $outer } else { $inner }
        $pts.Add([System.Drawing.Point]::new(
            [int]($cx + $r2 * [Math]::Cos($angle)),
            [int]($cy + $r2 * [Math]::Sin($angle))
        ))
    }
    $g.FillPolygon($br, $pts.ToArray())
    $br.Dispose()
}

function Draw-CheckIcon {
    param($g, $cx, $cy, $size, $color)
    $br = New-Object System.Drawing.SolidBrush($color)
    $g.FillEllipse($br, $cx - $size/2, $cy - $size/2, $size, $size)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [int]($size*0.12))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, $cx - $size*0.28, $cy,           $cx - $size*0.05, $cy + $size*0.25)
    $g.DrawLine($pen, $cx - $size*0.05, $cy + $size*0.25, $cx + $size*0.30, $cy - $size*0.22)
    $br.Dispose(); $pen.Dispose()
}

function Draw-MegaphoneIcon {
    param($g, $cx, $cy, $size, $color)
    $br = New-Object System.Drawing.SolidBrush($color)
    # Body rectangle
    $bw = [int]($size * 0.55); $bh = [int]($size * 0.38)
    $g.FillRectangle($br, $cx - $bw/2, $cy - $bh/2, $bw, $bh)
    # Cone to the right
    $pts = @(
        [System.Drawing.Point]::new($cx + $bw/2,     $cy - $bh/2),
        [System.Drawing.Point]::new($cx + $bw/2,     $cy + $bh/2),
        [System.Drawing.Point]::new($cx + [int]($size*0.52), $cy + [int]($size*0.44)),
        [System.Drawing.Point]::new($cx + [int]($size*0.52), $cy - [int]($size*0.44))
    )
    $g.FillPolygon($br, $pts)
    # Small handle
    $g.FillRectangle($br, $cx - $bw/2 - [int]($size*0.12), $cy - $bh/4, [int]($size*0.12), $bh/2)
    $br.Dispose()
}

function Make-Screenshot {
    param($filename, $title, $subtitle, $items, $accent, $iconType, $badge)

    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Background gradient
    $topC    = [System.Drawing.Color]::FromArgb(255,12,12,22)
    $bottomC = [System.Drawing.Color]::FromArgb(255,22,22,42)
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.Point]::new(0,0),
        [System.Drawing.Point]::new(0,$H),
        $topC, $bottomC)
    $g.FillRectangle($grad, 0, 0, $W, $H)

    # Accent top stripe
    $accentColor = [System.Drawing.ColorTranslator]::FromHtml($accent)
    $stripeBr = New-Object System.Drawing.SolidBrush($accentColor)
    $g.FillRectangle($stripeBr, 0, 0, $W, 10)

    # Frame
    $fX = 60; $fY = 110; $fW = $W - 120; $fH = 860
    $frameBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,18,28,52))
    $g.FillRectangle($frameBg, $fX, $fY, $fW, $fH)
    $framePen = New-Object System.Drawing.Pen($accentColor, 3)
    $g.DrawRectangle($framePen, $fX, $fY, $fW, $fH)

    # Grid
    $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(22,255,255,255), 1)
    for ($x = $fX; $x -lt $fX+$fW; $x += 90) { $g.DrawLine($gridPen, $x, $fY, $x, $fY+$fH) }
    for ($y = $fY; $y -lt $fY+$fH; $y += 90)  { $g.DrawLine($gridPen, $fX, $y, $fX+$fW, $y) }

    # Map pins scattered
    $pinDefs = @(
        @{ x=220; y=210; c='#FF5722' },
        @{ x=780; y=290; c='#4CAF50' },
        @{ x=450; y=480; c='#2196F3' },
        @{ x=880; y=560; c='#FF9800' },
        @{ x=160; y=640; c='#9C27B0' },
        @{ x=640; y=720; c='#00BCD4' }
    )
    foreach ($pd in $pinDefs) {
        $pc = [System.Drawing.ColorTranslator]::FromHtml($pd.c)
        Draw-MapIcon $g ($fX + $pd.x) ($fY + $pd.y) 52 $pc
    }

    # Central icon (large, vectorial)
    $icx = [int]($W / 2); $icy = [int]($fY + $fH / 2)
    switch ($iconType) {
        'map'       { Draw-MapIcon       $g $icx $icy 200 $accentColor }
        'alert'     { Draw-AlertIcon     $g $icx $icy 200 $accentColor }
        'star'      { Draw-StarIcon      $g $icx $icy 200 $accentColor }
        'check'     { Draw-CheckIcon     $g $icx $icy 200 $accentColor }
        'megaphone' { Draw-MegaphoneIcon $g $icx $icy 200 $accentColor }
    }

    # Glow behind icon
    $glowBr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, $accentColor.R, $accentColor.G, $accentColor.B))
    for ($gi = 5; $gi -ge 1; $gi--) {
        $gr2 = 120 + $gi * 30
        $g.FillEllipse($glowBr, $icx - $gr2, $icy - $gr2, $gr2*2, $gr2*2)
    }
    $glowBr.Dispose()

    # Re-draw icon on top of glow
    switch ($iconType) {
        'map'       { Draw-MapIcon       $g $icx $icy 200 $accentColor }
        'alert'     { Draw-AlertIcon     $g $icx $icy 200 $accentColor }
        'star'      { Draw-StarIcon      $g $icx $icy 200 $accentColor }
        'check'     { Draw-CheckIcon     $g $icx $icy 200 $accentColor }
        'megaphone' { Draw-MegaphoneIcon $g $icx $icy 200 $accentColor }
    }

    # Badge pill
    if ($badge) {
        $badgeFont   = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Bold)
        $badgeBr     = New-Object System.Drawing.SolidBrush($accentColor)
        $badgeTextBr = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $badgeSf     = New-Object System.Drawing.StringFormat
        $badgeSf.Alignment     = [System.Drawing.StringAlignment]::Center
        $badgeSf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $bx = [int]($W/2 - 140); $by = $fY + $fH - 68
        $g.FillRectangle($badgeBr, $bx, $by, 280, 50)
        $g.DrawString($badge, $badgeFont, $badgeTextBr, [System.Drawing.RectangleF]::new($bx,$by,280,50), $badgeSf)
        $badgeFont.Dispose(); $badgeBr.Dispose(); $badgeTextBr.Dispose()
    }

    # --- Text section ---
    $textY = $fY + $fH + 48

    $titleFont = New-Object System.Drawing.Font('Segoe UI', 45, [System.Drawing.FontStyle]::Bold)
    $titleBr   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $titleSf   = New-Object System.Drawing.StringFormat
    $titleSf.Alignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($title, $titleFont, $titleBr, [System.Drawing.RectangleF]::new(40, $textY, $W-80, 85), $titleSf)

    $subFont = New-Object System.Drawing.Font('Segoe UI', 27)
    $subBr   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170,255,255,255))
    $subSf   = New-Object System.Drawing.StringFormat
    $subSf.Alignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($subtitle, $subFont, $subBr, [System.Drawing.RectangleF]::new(40, $textY+92, $W-80, 65), $subSf)

    # Items 2 columns
    $itemFont = New-Object System.Drawing.Font('Segoe UI', 24)
    $itemBr   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210,255,255,255))
    $dotBr    = New-Object System.Drawing.SolidBrush($accentColor)
    $col1X = 80; $col2X = [int]($W/2 + 20)
    $itemY = $textY + 172
    $half  = [math]::Ceiling($items.Count / 2)
    for ($i = 0; $i -lt $items.Count; $i++) {
        $cx = if ($i -lt $half) { $col1X } else { $col2X }
        $cy = $itemY + ($i % $half) * 62
        $g.FillEllipse($dotBr, $cx, $cy+12, 14, 14)
        $g.DrawString($items[$i], $itemFont, $itemBr, [System.Drawing.RectangleF]::new($cx+28, $cy, [int]($W/2)-50, 55))
    }

    # Branding
    $brandFont = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Bold)
    $brandBr   = New-Object System.Drawing.SolidBrush($accentColor)
    $brandSf   = New-Object System.Drawing.StringFormat
    $brandSf.Alignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString('ALERTOO', $brandFont, $brandBr, [System.Drawing.RectangleF]::new(0, $H-70, $W, 52), $brandSf)

    $g.Dispose()
    $bmp.Save($outDir + '\' + $filename, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved $filename"
}

# 01
Make-Screenshot '01-mapa.png'      'Mapa em Tempo Real'    'Blitz, acidentes e eventos perto de voce'      @('Blitz da Lei Seca','Acidentes e obras','Alagamentos na via','Shows e festivais','Pins por categoria','Atualizado ao vivo') '#FF5722' 'map'       'AO VIVO'
# 02
Make-Screenshot '02-reportar.png'  'Reporte em 1 Toque'   'Ajude outros motoristas em segundos'           @('Sem cadastro','Localizacao automatica','Blitz, acidente, obra','Ganhe pontos','Confirmado pela comunidade','Rapido e simples') '#F44336' 'alert'     'REPORTE AGORA'
# 03
Make-Screenshot '03-eventos.png'   'Eventos Perto de Voce' 'Bares, shows e festas na sua cidade'          @('Filtro por categoria','Filtro por distancia','Salve favoritos','Abra no Google Maps','Receba lembretes','Descubra novidades') '#4CAF50' 'star'      'DESCUBRA'
# 04
Make-Screenshot '04-comunidade.png' 'Comunidade Ativa'    'Confirme alertas e suba no ranking'            @('Confirme alertas','Negue alertas falsos','Comente e curta','Iniciante ate Lenda','Ranking semanal','Sistema de reputacao') '#2196F3' 'check'     'PARTICIPE'
# 05
Make-Screenshot '05-promover.png'  'Promova Seu Negocio'  'Pacotes Bronze, Prata e Ouro'                  @('A partir de R$ 4,99','Foto em destaque','Animacao exclusiva','Tag colorida no mapa','Creditos gratis','Mais visibilidade') '#FF9800' 'megaphone' 'ANUNCIE JA'

Write-Host 'Done!'
