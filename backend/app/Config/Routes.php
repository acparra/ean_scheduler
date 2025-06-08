<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

$routes->get('courses/search', 'Courses::search');
$routes->resource('courses', ['controller' => 'Courses']);
