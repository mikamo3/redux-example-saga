import { createAsyncAction, createReducer, ActionType } from "typesafe-actions";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import { put, takeEvery, takeLatest } from "redux-saga/effects";
//action

//createAsyncActionでまとめて定義できる
//https://github.com/piotrwitek/typesafe-actions#with-redux-saga-sagas
const hogeAction = createAsyncAction(
  "HOGE_REQUEST",
  "HOGE_SUCCESS",
  "HOGE_FAILURE",
  "HOGE_CANCELED" //キャンセルの定義は任意
)<string, string, string, undefined>();

//reducer
//原則としてreducerの中に副作用を生む処理は書いてはいけないのでredux-sagaでかく

interface State {
  state: string;
  data: string;
}
const initialstate = {
  state: "",
  data: ""
};
type HogeActionType = ActionType<typeof hogeAction>;

const hogeReducer = createReducer<State, HogeActionType>(initialstate)
  .handleAction(hogeAction.request, (state, action) => ({
    state: "request",
    data: ""
  }))
  //リクエスト成功時、dataをstateに入れる
  .handleAction(hogeAction.success, (state, action) => ({
    state: "success",
    data: action.payload
  }))
  .handleAction(hogeAction.failure, (state, action) => ({
    state: "failure",
    data: action.payload
  }))
  .handleAction(hogeAction.cancel, (state, action) => ({
    state: "cansel",
    data: ""
  }));

// API 1秒待ってパラメータに文字を付与して返却
// 2回目以降のリクエストは失敗する
let requested = false;
const api = async (str: string) => {
  if (!requested) {
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        requested = true;
        resolve(`${str} hoge`);
      }, 1000)
    );
  } else {
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        reject(`${str} hoge`);
      }, 1000)
    );
  }
};

//saga
//generator関数をアロー関数で書く方法がわからないので普通にかく
function* fetchHoge(action: ReturnType<typeof hogeAction.request>) {
  try {
    console.log("api実行");
    const fetchData: string = yield api(action.payload);
    console.log("api実行完了");
    yield put(hogeAction.success(fetchData));
  } catch (error) {
    console.log("api実行失敗");
    yield put(hogeAction.failure("error"));
  }
}

function* mySaga() {
  //takeEveryはリクエストをキャンセルせず指定のアクションが送出するたびにfetchHogeを起動する
  yield takeEvery(hogeAction.request, fetchHoge);
  //takeLatestは複数リクエストがあった場合、待ち状態のリクエストはキャンセルされて最後の1つだけが実行されます。
  //yield takeLatest(hogeAction.request, fetchHoge);
}
//sagaミドルウェアを作成する
const sagaMiddleware = createSagaMiddleware();
//storeにマウントする
const store = createStore(hogeReducer, applyMiddleware(sagaMiddleware));

//アクションがdispatchされるごとにstateの状態を表示
store.subscribe(() => console.log(store.getState()));
//sagaを起動する
sagaMiddleware.run(mySaga);

//複数のアクションをdispatchしたときにtakeEveryとtakeLatestで挙動が変わることを確認
store.dispatch(hogeAction.request("request1"));
store.dispatch(hogeAction.request("request2"));
store.dispatch(hogeAction.request("request3"));
store.dispatch(hogeAction.request("request4"));
store.dispatch(hogeAction.request("request5"));

//エラーを起こしてみる
setTimeout(() => {
  store.dispatch(hogeAction.request("hoge"));
}, 1500);
