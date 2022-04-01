<?php

/*
* File: SimpleImage.php
* Author: Simon Jarvis
* Copyright: 2006 Simon Jarvis
* Date: 08/11/06
* Link: http://www.white-hat-web-design.co.uk/blog/resizing-images-with-php/
*
* This program is free software; you can redistribute it and/or
* modify it under the terms of the GNU General Public License
* as published by the Free Software Foundation; either version 2
* of the License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details:
* http://www.gnu.org/licenses/gpl.html
*
*/

class SimpleImage {
    
    var $image;
    var $image_type;
    
    function load($data) {
        $this->image = imagecreatefromstring($data);
    }

    function output() {
        $stream = fopen("php://memory", "w+");
        //imagepng($this->image, $stream);
        imagejpeg($this->image, $stream, 75);
        rewind($stream);
        return stream_get_contents($stream);
    }
    
    function getWidth() {
        return imagesx($this->image);
    }
    
    function getHeight() {
        return imagesy($this->image);
    }
    
    function resizeToHeight($height) {
        $ratio = $height / $this->getHeight();
        $width = $this->getWidth() * $ratio;
        $this->resize($width,$height);
    }
    
    function resizeToWidth($width) {
        $ratio = $width / $this->getWidth();
        $height = $this->getheight() * $ratio;
        $this->resize($width,$height);
    }
    
    function scale($scale) {
        $width = $this->getWidth() * $scale/100;
        $height = $this->getheight() * $scale/100;
        $this->resize($width,$height);
    }
    
    function resize($width,$height) {
        $new_image = imagecreatetruecolor($width, $height);
        imagefill($new_image, 0, 0, imagecolorallocate($new_image, 255, 255, 255));  // white background;
        imagecopyresampled($new_image, $this->image, 0, 0, 0, 0, $width, $height, $this->getWidth(), $this->getHeight());
        $this->image = $new_image;
    }
    
}
