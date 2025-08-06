<?php

namespace App\Models\Products;

use App\Models\Link;
use App\Models\LinkProductVarient;
use App\Models\Products\Product;
use App\Models\Orders\OrderLineItem;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVarient extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'shopify_product_varient_id', 'shopify_inventory_item_id', 'compare_at_price', 'price', 'title', 'inventory_quantity'];

    /**
     * Mutator to handle negative inventory quantity values
     * @param mixed $value
     * @return void
     */
    public function setInventoryQuantityAttribute($value)
    {
        // Convert negative inventory values to 0 if needed
        // or store as is if your database now supports negative values
        $this->attributes['inventory_quantity'] = $value;
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    
    public function link(){
        return $this->belongsTo(Link::class);
    }
    public function linkedVariants()
    {
        return $this->hasMany(LinkProductVarient::class, 'variant_id', 'shopify_product_varient_id');
    }
}
