<?php

namespace App\Models\Products;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'shopify_product_id', 'title', 'vendor', 'status', 'published'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVarient::class, 'product_id');
    }

    public function media()
    {
        return $this->hasMany(ProductMedia::class, 'product_id');
    }
}
