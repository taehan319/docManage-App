//////////////////////////////////////////////////
// (エンドユーザ)本店以外のユーザによるアクセス制御 //
//////////////////////////////////////////////////
import * as CONST from './contains';
// 制御必要なURLリスト
const urlPermissionsRule = [
    　'/brands/selectAll'
    ,'/brands/delete'
    ,'/brands/update'
    ,'/brands/register'
    ,'/brands/selectMaker'
    ,'/factories/selectAll'
    ,'/factories/delete'
    ,'/factories/update'
    ,'/factories/register'
    ,'/items/selectAll'
    ,'/items/delete'
    ,'/items/update'
    ,'/itemrs/register'
    ,'/makers/selectAll'
    ,'/makers/delete'
    ,'/makers/update'
    ,'/makers/register'
    ,'/users/selectAll'
    ,'/users/delete'
    ,'/users/update'
    ,'/users/register'
    ,'/sales/select/company'
    ,'/sales/select/detail'
    ,'/sales/update/saleDetails'
    ,'/sales/update/saleMng/mng'
    ,'/sales/cancel/mng'
    ,'/sales/register'
    ,'/sales/order'
    ,'/inventorySetting/update'
    ,'/inventorySetting/register'
    ,'/csv/select'
    ,'/general/selectAll'
];

export const checkUrlPermission = (authority, url) =>{
    let isCheck = true;
    // ログインユーザが所属：本店(工場)の場合はすべて許可
    if (String(CONST.ADMIN_FACTORY_ID) === authority) {
        return isCheck;
    }
    for (let i = 0; i < urlPermissionsRule.length; i++) {
        if (url.includes(urlPermissionsRule[i])) {
            // 制御必要なURLに該当する場合
            isCheck = false;
            break;
        }
    };
    return isCheck;
}