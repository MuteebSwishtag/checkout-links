<?php

namespace App\Models\Products;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductMedia extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'shopify_product_media_id', 'src'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
