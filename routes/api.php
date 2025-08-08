<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LinkController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Public endpoint to get link data by ID for the extension
Route::get('/links/{id}', [LinkController::class, 'getLinkData'])->name('links.getLinkData');
Route::post('/order-count', [LinkController::class, 'count']);
